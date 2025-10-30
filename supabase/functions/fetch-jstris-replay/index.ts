import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { replayId } = await req.json();
    
    if (!replayId) {
      return new Response(
        JSON.stringify({ error: 'Replay ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[Jstris Proxy] Fetching replay ID: ${replayId}`);

    // Try multiple possible Jstris API endpoints
    const endpoints = [
      `https://jstris.jezevec10.com/api/replay/${replayId}`,
      `https://jstris.jezevec10.com/api/game/${replayId}`,
      `https://jstris.jezevec10.com/replay/${replayId}/data`,
      `https://jstris.jezevec10.com/api/replay/getData?replayId=${replayId}`,
    ];

    let lastError: Error | null = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`[Jstris Proxy] Trying endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'User-Agent': 'TetrisReplayBot/1.0',
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          // Check if response is JSON
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log(`[Jstris Proxy] Success from: ${endpoint}`);
            
            return new Response(
              JSON.stringify(data),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          } else {
            // Try to parse as text and then JSON
            const text = await response.text();
            try {
              const data = JSON.parse(text);
              console.log(`[Jstris Proxy] Success (text parsed) from: ${endpoint}`);
              
              return new Response(
                JSON.stringify(data),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              );
            } catch {
              console.warn(`[Jstris Proxy] Response is not JSON from: ${endpoint}`);
            }
          }
        } else {
          console.warn(`[Jstris Proxy] Failed (${response.status}): ${endpoint}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Jstris Proxy] Error from ${endpoint}:`, error);
        continue;
      }
    }

    // If all endpoints failed
    const errorMessage = lastError 
      ? `Failed to fetch Jstris replay: ${lastError.message}` 
      : 'All Jstris API endpoints failed. The replay may not exist or Jstris may be unavailable.';
    
    console.error(`[Jstris Proxy] All attempts failed for replay ${replayId}`);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        replayId,
        attemptedEndpoints: endpoints 
      }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('[Jstris Proxy] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        type: 'internal_error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
