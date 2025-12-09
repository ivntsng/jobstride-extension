chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
  if (message.type === 'FETCH_REQUEST' && message.config) {
    handleFetchRequest(message.config)
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
  return false;
});

async function handleFetchRequest(
  config: any,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Fetch request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
