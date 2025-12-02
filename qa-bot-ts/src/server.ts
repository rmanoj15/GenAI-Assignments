import "dotenv/config";
import dns from "dns";
import express from "express";
import { MongoClient } from "mongodb";

// Fix DNS resolution for MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { createChatModel, getModelInfo } from "./lib/models/index.js";
import { buildQAChain, loadDocumentToString } from "./lib/index.js";
import { ResumeVectorStore } from "./lib/vectorstore/index.js";
import { RetrievalPipeline } from "./pipelines/index.js";
import { 
  InvokeSchema, 
  InvokeBody, 
  InvokeResult, 
  SearchRequestSchema,
  SearchRequest,
  SearchResponse,
  ErrorResponse,
  ConversationalQuerySchema,
  ConversationalQueryBody,
  ConversationalQueryResult,
  GetConversationHistorySchema,
  GetConversationHistoryBody,
  ConversationHistoryResult,
  ChatMessage
} from "./types/index.js";
import { config } from "./config/index.js";
import { conversationStore } from "./lib/memory/index.js";
import { ConversationalRAGChainManager } from "./lib/conversationalRAGChain.js";
import { ConversationalFilter } from "./lib/conversationalFilter.js";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

// Initialize retrieval pipeline (will be set up on server start)
let retrievalPipeline: RetrievalPipeline | null = null;
let mongoClient: MongoClient | null = null;

// Health check endpoint
app.get("/health", (req, res) => {
  const modelInfo = getModelInfo();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    model: modelInfo,
    retrievalPipeline: retrievalPipeline ? "ready" : "not initialized",
    activeConversations: conversationStore.size()
  });
});

// Resume search endpoint (keyword, vector, hybrid)
app.post("/search/resumes", async (req, res) => {
  const traceId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    console.log(`\n[${traceId}] === SEARCH REQUEST RECEIVED ===`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Request Body:`, JSON.stringify(req.body, null, 2));

    // Validate request
    const parsed = SearchRequestSchema.parse(req.body as SearchRequest);
    
    console.log(`[${traceId}] Request validated`);
    console.log(`  Query: "${parsed.query}"`);
    console.log(`  Search Type: ${parsed.searchType}`);
    console.log(`  Top-K: ${parsed.topK}`);

    // Check if retrieval pipeline is ready
    if (!retrievalPipeline) {
      throw new Error("Retrieval pipeline not initialized. Please ensure MongoDB is connected.");
    }

    // Perform search using retrieval pipeline
    const results = await retrievalPipeline.search(
      parsed.query,
      parsed.searchType,
      parsed.topK,
      traceId
    );

    const duration = Date.now() - startTime;

    console.log(`[${traceId}] Search completed in ${duration}ms`);
    console.log(`[${traceId}] Found ${results.length} results`);

    // Build response
    const response: SearchResponse = {
      query: parsed.query,
      searchType: parsed.searchType,
      topK: parsed.topK,
      resultCount: results.length,
      duration,
      results,
      metadata: {
        traceId,
        ...(parsed.searchType === "hybrid" && {
          hybridWeights: {
            vector: config.hybridSearch.vectorWeight,
            keyword: config.hybridSearch.keywordWeight,
          },
        }),
      },
    };

    console.log(`📤 [${traceId}] Sending response to client`);
    console.log(`====================================\n`);

    res.json(response);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    
    console.error(`\n[${traceId}] === SEARCH ERROR ===`);
    console.error(`Error:`, err.message ?? String(err));
    console.error(`Duration: ${duration}ms`);
    console.error(`Stack:`, err.stack);
    console.error(`====================================\n`);

    const errorResponse: ErrorResponse = {
      error: err.message ?? String(err),
      details: err.stack,
      timestamp: new Date().toISOString(),
    };

    res.status(400).json(errorResponse);
  }
});

// Conversational chat endpoint with memory and RAG
app.post("/chat", async (req, res) => {
  const requestId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`\n[${requestId}] === CONVERSATIONAL RAG CHAT REQUEST ===`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Request Body:`, JSON.stringify(req.body, null, 2));

    const parsed = ConversationalQuerySchema.parse(req.body as ConversationalQueryBody);
    
    // Check if retrieval pipeline is ready
    if (!retrievalPipeline) {
      throw new Error("Retrieval pipeline not initialized. Please ensure MongoDB is connected.");
    }

    // Generate or use provided conversation ID
    const conversationId = parsed.conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isNewConversation = !parsed.conversationId;
    
    console.log(`[${requestId}] Conversation ID: ${conversationId} ${isNewConversation ? '(NEW)' : '(EXISTING)'}`);
    console.log(`[${requestId}] Message: "${parsed.message}"`);

    // Get or create memory for this conversation
    const memoryManager = conversationStore.getOrCreate(conversationId);
    
    // Get model info
    const modelInfo = getModelInfo();
    console.log(`[${requestId}] Using model: ${modelInfo.provider}/${modelInfo.model}`);

    // Create chat model
    const model = createChatModel();
    
    // Check if this is a filter query on cached results
    const isFilterQuery = ConversationalFilter.isFilterQuery(parsed.message);
    const hasCachedResults = memoryManager.hasSearchResults();
    const isExistingConversation = !isNewConversation; // User provided conversationId
    
    console.log(`[${requestId}] Filter query detected: ${isFilterQuery}`);
    console.log(`[${requestId}] Has cached results: ${hasCachedResults}`);
    console.log(`[${requestId}] Existing conversation: ${isExistingConversation}`);

    const startTime = Date.now();
    let response: string;
    let searchResults: any[];
    let searchType: string;

    // Use conversational filter if:
    // 1. It's an existing conversation with cached results AND (filter query OR any follow-up)
    // 2. Explicit filter keywords detected
    const shouldUseFilter = hasCachedResults && (isFilterQuery || isExistingConversation);

    if (shouldUseFilter) {
      console.log(`[${requestId}] 🔍 Using conversational filter on cached results...`);
      console.log(`[${requestId}]    Reason: ${isFilterQuery ? 'Filter keywords detected' : 'Follow-up on existing conversation'}`);
      
      const conversationalFilter = new ConversationalFilter(model);
      const cachedResults = memoryManager.getLastSearchResults();
      
      console.log(`[${requestId}] Filtering ${cachedResults.length} cached results with criteria: "${parsed.message}"`);
      
      const { filtered, summary } = await conversationalFilter.filterResults(
        parsed.message,
        cachedResults,
        requestId
      );
      
      searchResults = filtered;
      response = summary;
      searchType = "filter";
      
      console.log(`[${requestId}] ✅ Filter completed: ${filtered.length}/${cachedResults.length} results matched`);
      
      // Save the filter query and response to memory
      await memoryManager.addExchange(parsed.message, response);
      
    } else {
      // Normal RAG search
      console.log(`[${requestId}] 🔎 Processing with conversational RAG chain (full search)...`);
      
      const ragChain = new ConversationalRAGChainManager(model, memoryManager, retrievalPipeline);
      
      const result = await ragChain.chat(
        parsed.message,
        "hybrid",
        10, // topK
        requestId
      );
      
      response = result.response;
      searchResults = result.searchResults;
      searchType = "hybrid";
      
      console.log(`[${requestId}] Search results: ${searchResults.length} candidates`);
      
      // Cache the search results for potential filtering
      const structuredResults = searchResults.map(result => ({
        name: result.name,
        email: result.email,
        phoneNumber: result.phoneNumber,
        score: result.score,
        matchType: result.matchType,
        extractedInfo: (result as any).extractedInfo,
        llmReasoning: (result as any).llmReasoning,
      }));
      
      memoryManager.setLastSearchResults(structuredResults);
      console.log(`[${requestId}] Cached ${structuredResults.length} results for potential filtering`);
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Processing completed in ${duration}ms`);
    console.log(`[${requestId}] Response length: ${response.length} characters`);

    // Get message count
    const messageCount = await memoryManager.getMessageCount();

    // Log history if requested
    if (parsed.includeHistory) {
      await memoryManager.logHistory();
    }

    // Format structured search results
    const structuredResults = searchResults.map(result => ({
      name: result.name,
      email: result.email,
      phoneNumber: result.phoneNumber,
      score: result.score,
      matchType: result.matchType,
      extractedInfo: (result as any).extractedInfo,
      llmReasoning: (result as any).llmReasoning,
    }));

    const result: ConversationalQueryResult = {
      response,
      conversationId,
      messageCount,
      model: modelInfo.model,
      provider: modelInfo.provider,
      searchResults: structuredResults,
      searchMetadata: {
        query: parsed.message,
        searchType,
        resultCount: searchResults.length,
        duration,
      },
    };

    console.log(`[${requestId}] Sending response to client`);
    console.log(`====================================\n`);

    res.json(result);
  } catch (err: any) {
    console.error(`\n[${requestId}] === CHAT ERROR ===`);
    console.error(`Error:`, err.message ?? String(err));
    console.error(`Stack:`, err.stack);
    console.error(`====================================\n`);

    res.status(400).json({ error: err.message ?? String(err) });
  }
});

// Get conversation history endpoint
app.post("/chat/history", async (req, res) => {
  const requestId = `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`\n[${requestId}] === GET CONVERSATION HISTORY ===`);
    console.log(`Request Body:`, JSON.stringify(req.body, null, 2));

    const parsed = GetConversationHistorySchema.parse(req.body as GetConversationHistoryBody);
    
    console.log(`[${requestId}] Conversation ID: ${parsed.conversationId}`);

    // Check if conversation exists
    if (!conversationStore.has(parsed.conversationId)) {
      return res.status(404).json({ 
        error: `Conversation not found: ${parsed.conversationId}` 
      });
    }

    // Get memory manager
    const memoryManager = conversationStore.getOrCreate(parsed.conversationId);
    
    // Get all messages
    const messages = await memoryManager.getMessages();
    
    // Convert to API format
    const chatMessages: ChatMessage[] = messages.map(msg => ({
      role: msg instanceof HumanMessage ? "user" : "assistant",
      content: msg.content.toString(),
    }));

    const result: ConversationHistoryResult = {
      conversationId: parsed.conversationId,
      messages: chatMessages,
      messageCount: chatMessages.length,
    };

    console.log(`[${requestId}] Retrieved ${chatMessages.length} messages`);
    console.log(`📤 [${requestId}] Sending history to client\n`);

    res.json(result);
  } catch (err: any) {
    console.error(`\n[${requestId}] === HISTORY ERROR ===`);
    console.error(`Error:`, err.message ?? String(err));
    console.error(`Stack:`, err.stack);
    console.error(`====================================\n`);

    res.status(400).json({ error: err.message ?? String(err) });
  }
});

// Delete conversation endpoint
app.delete("/chat/:conversationId", async (req, res) => {
  const requestId = `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const conversationId = req.params.conversationId;
  
  try {
    console.log(`\n[${requestId}] === DELETE CONVERSATION ===`);
    console.log(`Conversation ID: ${conversationId}`);

    const deleted = conversationStore.delete(conversationId);
    
    if (!deleted) {
      return res.status(404).json({ 
        error: `Conversation not found: ${conversationId}` 
      });
    }

    console.log(`[${requestId}] Conversation deleted successfully\n`);

    res.json({ 
      success: true, 
      conversationId,
      message: "Conversation deleted successfully" 
    });
  } catch (err: any) {
    console.error(`\n[${requestId}] === DELETE ERROR ===`);
    console.error(`Error:`, err.message ?? String(err));
    console.error(`====================================\n`);

    res.status(400).json({ error: err.message ?? String(err) });
  }
});

app.post("/search/document", async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`\n[${requestId}] === NEW REQUEST RECEIVED ===`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Request Body:`, JSON.stringify(req.body, null, 2));

    const parsed = InvokeSchema.parse(req.body as InvokeBody);
    
    console.log(`[${requestId}] Request validated successfully`);
    console.log(`Question: "${parsed.question}"`);
    console.log(`Document source: ${parsed.documentPath ? `File: ${parsed.documentPath}` : `Inline text (${parsed.documentText?.length || 0} chars)`}`);
    console.log(`Prompt type: ${parsed.promptType || 'default'}`);

    const document =
      parsed.documentText ??
      (await loadDocumentToString(parsed.documentPath as string));

    console.log(`[${requestId}] Document loaded: ${document.length} characters`);

    const modelInfo = getModelInfo();
    console.log(`[${requestId}] Using model: ${modelInfo.provider}/${modelInfo.model}`);

    const model = createChatModel();
    const chain = buildQAChain(model, parsed.promptType);

    console.log(`[${requestId}] Processing with QA chain...`);
    const startTime = Date.now();

    const output = await chain.invoke({
      document,
      question: parsed.question
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Chain processing completed in ${duration}ms`);
    console.log(`[${requestId}] Output length: ${output.length} characters`);

    const result: InvokeResult = {
      output,
      model: modelInfo.model,
      provider: modelInfo.provider,
      promptType: parsed.promptType || "default"
    };

    console.log(`[${requestId}] Sending response to client`);
    console.log(`====================================\n`);

    res.json(result);
  } catch (err: any) {
    console.error(`\n[${requestId}] === REQUEST ERROR ===`);
    console.error(`Error:`, err.message ?? String(err));
    console.error(`Stack:`, err.stack);
    console.error(`====================================\n`);

    res.status(400).json({ error: err.message ?? String(err) });
  }
});

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "localhost";
const serverUrl = process.env.SERVER_URL ?? `http://${host}:${port}`;

/**
 * Initialize retrieval pipeline on server startup
 */
async function initializeRetrievalPipeline() {
  try {
    console.log("Initializing Retrieval Pipeline...");
    
    // Create MongoDB client
    const uri = config.mongodb.uri;
    if (!uri) {
      throw new Error("MONGODB_URI not configured");
    }
    
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    console.log("Connected to MongoDB");
    
    // Get collection
    const db = mongoClient.db(config.mongodb.dbName);
    const collection = db.collection(config.mongodb.collection);
    
    // Determine the correct API key based on embedding provider
    const embeddingApiKey = config.embeddings.provider === 'mistral'
      ? config.mistral.apiKey
      : config.openai.apiKey;
    
    if (!embeddingApiKey) {
      throw new Error(`API key not configured for embedding provider: ${config.embeddings.provider}`);
    }
    
    // Create vector store with full config
    const vectorStore = new ResumeVectorStore({
      mongoUri: config.mongodb.uri,
      dbName: config.mongodb.dbName,
      collectionName: config.mongodb.collection,
      indexName: config.mongodb.vectorIndexName,
      embeddingProvider: config.embeddings.provider,
      embeddingModel: config.embeddings.model,
      apiKey: embeddingApiKey,
    });
    
    // Initialize vector store
    await vectorStore.initialize();
    
    // Create chat model for LLM re-ranking (if enabled)
    let chatModel = undefined;
    if (config.llmReranking.enabled) {
      try {
        chatModel = createChatModel();
        console.log(`LLM re-ranking enabled with ${config.modelProvider} model`);
      } catch (error) {
        console.warn("Failed to initialize chat model for LLM re-ranking:", error);
        console.warn("LLM re-ranking will be disabled");
      }
    } else {
      console.log("LLM re-ranking disabled");
    }
    
    // Initialize retrieval pipeline with hybrid config and optional LLM re-ranking
    retrievalPipeline = new RetrievalPipeline(
      collection,
      vectorStore,
      {
        vectorWeight: config.hybridSearch.vectorWeight,
        keywordWeight: config.hybridSearch.keywordWeight
      },
      chatModel,
      {
        enabled: config.llmReranking.enabled,
        retrievalTopK: config.llmReranking.retrievalTopK
      }
    );
    
    console.log("Retrieval Pipeline initialized");
    console.log(`   - Database: ${config.mongodb.dbName}`);
    console.log(`   - Collection: ${config.mongodb.collection}`);
    console.log(`   - Vector Index: ${config.mongodb.vectorIndexName}`);
    console.log(`   - Hybrid Weights: vector=${config.hybridSearch.vectorWeight}, keyword=${config.hybridSearch.keywordWeight}`);
    
  } catch (error) {
    console.error("Failed to initialize retrieval pipeline:", error);
    console.error("   The /search/resumes endpoint will not be available");
    console.error("   Please check your MongoDB connection and configuration");
  }
}

app.listen(port, async () => {
  const modelInfo = getModelInfo();
  console.log(`QA Bot API listening on ${serverUrl}`);
  console.log(`Provider: ${modelInfo.provider}`);
  console.log(`Model: ${modelInfo.model}`);
  console.log(`Temperature: ${modelInfo.temperature}`);
  
  // Initialize retrieval pipeline after server starts
  await initializeRetrievalPipeline();
  console.log("Server ready!");
});
