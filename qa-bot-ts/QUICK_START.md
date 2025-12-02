# 🎯 Getting Started - Quick Access Guide

## ⚡ Start Everything in 2 Steps

### Step 1: Start Backend (in Terminal 1)
```bash
cd /Users/macbook/Documents/GitHub/GenAI-Assignments/qa-bot-ts
npm run dev
```

Wait for: `Server ready!` message

### Step 2: Start Frontend (in Terminal 2)
```bash
cd /Users/macbook/Documents/GitHub/GenAI-Assignments/qa-bot-ts/public
npm run dev
```

Wait for: `Local: http://localhost:5173/` message

### Step 3: Open in Browser
```
http://localhost:5173
```

---

## 📋 What You'll See

### Home Page (Health Monitor Tab)
- ✅ Server Status: healthy
- ✅ Model: groq / meta-llama/llama-4-maverick-17b-128e-instruct
- ✅ Pipeline: ready
- ✅ Active Conversations: 0

### Try These Features

#### 🔍 Resume Search Tab
**Example Query:**
```
"Python developer with AWS and Docker experience"
```
- Select Search Type: `Hybrid`
- Set Top K: `5`
- Click "Search Resumes"

#### ❓ Document Q&A Tab
**Example:**
1. Paste this text in "Document Text":
```
John Smith is a software engineer with 5 years of experience in Python, 
JavaScript, and cloud technologies. He has worked at Google and Amazon. 
He specializes in backend development and machine learning.
```

2. Ask Question:
```
What is John's experience level?
```

3. Response Type: `Detailed`
4. Click "Ask Question"

#### 💬 Chat Tab
**Example:**
1. Type message:
```
Find me senior software engineers with Python and cloud experience
```
2. Click "Send"
3. System automatically searches and displays results
4. Try a follow-up:
```
Filter those to only AWS experience
```

#### 📋 Conversations Tab
1. Create a new chat (get a conversation ID from Chat tab)
2. Paste the ID in the input field
3. Click "Add"
4. Click on the conversation to view its history
5. Click "Delete Conversation" to remove it

---

## 🔧 Troubleshooting

### Frontend Shows "Cannot connect to backend"
✅ **Solution:** Make sure backend is running at `http://localhost:8787`
```bash
curl http://localhost:8787/health
```

### Frontend Blank Page
✅ **Solution:** Check browser console (F12) for errors. Try:
```bash
# Kill any processes on port 5173
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Restart frontend
cd public && npm run dev
```

### Backend Not Responding
✅ **Solution:** Check MongoDB connection in `.env`
- Verify `MONGODB_URI` is correct
- Check internet connection (MongoDB Atlas requires it)

---

## 📱 API Endpoints (All Integrated)

| Feature | Endpoint | Method |
|---------|----------|--------|
| Health | `/health` | GET |
| Search | `/search/resumes` | POST |
| Q&A | `/search/document` | POST |
| Chat | `/chat` | POST |
| History | `/chat/history` | POST |
| Delete | `/chat/:id` | DELETE |

---

## 🎮 Test Cases

### Test 1: System Health
- [ ] Open "Health Monitor" tab
- [ ] Verify status shows "healthy"
- [ ] Check that model is loaded

### Test 2: Search Resumes
- [ ] Go to "Resume Search" tab
- [ ] Enter: "full stack developer"
- [ ] Try each search type (keyword, vector, hybrid)
- [ ] Verify results appear with scores

### Test 3: Document Q&A
- [ ] Go to "Document Q&A" tab
- [ ] Paste any text in "Document Text"
- [ ] Ask: "What is the main topic?"
- [ ] Verify response appears

### Test 4: Conversation
- [ ] Go to "Chat" tab
- [ ] Type: "Show me data engineers"
- [ ] Verify search results display
- [ ] Type follow-up: "filter by location"
- [ ] Verify filtering works

### Test 5: Manage Conversations
- [ ] From Chat tab, note the conversation ID
- [ ] Go to "Conversations" tab
- [ ] Paste the ID and click "Add"
- [ ] Click the conversation to view history
- [ ] Verify message count shows

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| **Frontend Bundle Size** | 252 KB (gzipped) |
| **Build Time** | ~1.4 seconds |
| **API Response Time** | 200-500ms (depends on query) |
| **Page Load Time** | ~1-2 seconds |

---

## 🎨 UI Overview

```
┌─────────────────────────────────────┐
│      QA Bot Dashboard               │  ← Header
├─────────────────────────────────────┤
│ 🏥 ⏬ 🔍 ⏬ ❓ ⏬ 💬 ⏬ 📋 ⏬          │  ← Tabs
├─────────────────────────────────────┤
│                                     │
│   [Active Tab Content]              │
│   - Forms                           │
│   - Results                         │
│   - Messages                        │
│                                     │
├─────────────────────────────────────┤
│  Footer: Version & Tech Stack       │
└─────────────────────────────────────┘
```

---

## ✨ Pro Tips

1. **Keyboard Shortcuts:**
   - Tab to navigate between input fields
   - Enter in chat to send message quickly

2. **Search Tips:**
   - Use specific keywords for better results
   - Hybrid search usually gives best results
   - Increase topK for more candidates

3. **Chat Tips:**
   - First message triggers full search
   - Follow-ups use conversation memory
   - Use filter keywords: "show", "filter", "only", "exclude"

4. **Performance:**
   - Keep topK under 20 for faster responses
   - Close old conversations to free memory
   - Refresh browser if UI freezes

---

## 📞 Monitoring

To monitor backend in real-time:
```bash
# Terminal 3
watch -n 1 'curl -s http://localhost:8787/health | jq .'
```

---

## 🚀 You're All Set!

Everything is configured and ready. Just:
1. Start backend
2. Start frontend  
3. Open browser
4. Start testing!

**Enjoy using the QA Bot Dashboard! 🎉**
