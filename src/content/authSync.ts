const syncJobStrideAuth = async (): Promise<boolean> => {
  try {
    return await window.Auth.syncAuthFromCurrentPage();
  } catch {
    return false;
  }
};

void syncJobStrideAuth();

let fastSyncAttempts = 0;
const fastSyncTimer = window.setInterval(() => {
  fastSyncAttempts += 1;
  void syncJobStrideAuth();

  if (fastSyncAttempts >= 15) {
    window.clearInterval(fastSyncTimer);
  }
}, 2000);

window.setInterval(() => {
  void syncJobStrideAuth();
}, 60000);

window.addEventListener('focus', () => {
  void syncJobStrideAuth();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    void syncJobStrideAuth();
  }
});
