# GROQ API Optimization Guide

## Problem: Token Limit Exceeded

**Error**: `Request too large for model llama-3.1-8b-instant: Limit 6000, Requested 6094`

This is a **rate limit** (tokens per minute), not a usage cap. The free tier has per-minute limits.

## GROQ Free Tier Limits

| Model | TPM Limit | Status |
|-------|-----------|--------|
| `llama-3.1-8b-instant` | 6,000 TPM | Free |
| `gemma2-9b-it` | 15,000 TPM | Free |
| `llama-3.3-70b-versatile` | 30,000+ TPM | Paid tier |
| `mixtral-8x7b-32768` | 30,000+ TPM | Paid tier |

## Solutions Implemented

### ✅ 1. Model Fallback Optimization

**File**: `src/app/api/ai/lib/utils.ts`

- **Prioritizes `gemma2-9b-it`** (15K TPM) as first choice
- Falls back to `llama-3.1-8b-instant` (6K TPM) if needed
- Automatically handles rate limit errors (413/429) and tries next model

### ✅ 2. Knowledge Base Condensation

**File**: `src/app/api/ai/chat/route.ts`

- Created `getCondensedKnowledgeBase()` function
- Extracts only essential sections to reduce token count
- Reduces payload from ~6000 tokens to ~3000-4000 tokens
- Falls back to full knowledge base if condensed version is larger

### ✅ 3. Context Window Optimization

**File**: `src/app/api/ai/chat/route.ts`

- Only sends **last 5 messages** instead of full conversation history
- Reduces token count while maintaining context
- Prevents token accumulation in long conversations

### ✅ 4. Smart Error Handling

**File**: `src/app/api/ai/lib/utils.ts`

- Detects rate limit errors (413, 429)
- Automatically tries next model with higher limits
- Provides clear error messages with model information

## Upgrade Options

### Option 1: GROQ Dev Tier (Recommended)

**Cost**: ~$9-15/month
**Benefits**:
- Higher TPM limits (30K+ for most models)
- Better model access
- Priority support

**Sign up**: https://console.groq.com/settings/billing

### Option 2: Stay on Free Tier

**Current Setup**:
- ✅ Uses `gemma2-9b-it` (15K TPM) - should handle most requests
- ✅ Condensed knowledge base reduces token count
- ✅ Context window optimization prevents accumulation
- ✅ Automatic fallback to other free models

**If still hitting limits**:
1. Further reduce knowledge base size
2. Implement request queuing/throttling
3. Cache common responses

## Testing

After these optimizations, test the chat:

1. **Short queries**: Should work with `gemma2-9b-it` (15K TPM)
2. **Long conversations**: Context window limited to 5 messages
3. **Rate limit errors**: Automatically tries next model

## Monitoring

Check GROQ dashboard for usage:
- https://console.groq.com/usage

Monitor these metrics:
- Requests per minute
- Tokens per minute
- Error rates
- Model usage distribution

## Additional Optimizations (If Needed)

### 1. Further Knowledge Base Reduction

```typescript
// In src/app/api/ai/chat/route.ts
// Reduce to only most essential sections
const minimalKB = `
## EventWizz Overview
- Multi-tenant event platform
- Roles: admin, vendor, customer
- Partner: White-label deployment model
- 11-step vendor onboarding
- Booking system with tables/tickets
`;
```

### 2. Request Throttling

```typescript
// Add rate limiting middleware
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  await rateLimit(req); // Limit to 10 requests/minute
  // ... rest of code
}
```

### 3. Response Caching

```typescript
// Cache common responses
const cache = new Map();
const cacheKey = messages[messages.length - 1].content;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

## Current Status

✅ **Optimized for free tier**
- Using `gemma2-9b-it` (15K TPM limit)
- Condensed knowledge base
- Limited context window
- Smart error handling

✅ **Ready for production**
- Automatic fallback system
- Graceful error handling
- Token optimization

---

**Last Updated**: 2025-01-12

