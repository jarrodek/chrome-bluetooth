var windowsNum = 0;

var createWindow = () => {
  chrome.app.window.create('demo/index.html', {
    id: 'demo-' + windowsNum,
    bounds: {
      width: 1024,
      height: 800
    }
  }, () => {
    windowsNum++;
  });
};

chrome.app.runtime.onLaunched.addListener(() => {
  createWindow();
});
