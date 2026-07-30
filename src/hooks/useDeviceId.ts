export function useDeviceId() {
  const getDeviceId = () => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomPart = '';
      for (let i = 0; i < 5; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      id = `DVC-${randomPart}`;
      localStorage.setItem('deviceId', id);
    }
    return id;
  };

  return getDeviceId();
}
