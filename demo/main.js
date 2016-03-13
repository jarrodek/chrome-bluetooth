var demo = document.querySelector('template');
demo.isService = false;
demo.isClient = false;
demo.noRole = true;
demo.serviceCreated = false;
demo.addEventListener('dom-change', function() {
  demo.set('uuid', '1506');
  
});
demo._openWindow = () => {
  chrome.runtime.getBackgroundPage((bg) => {
    bg.createWindow();
  });
};
demo._setService = () => {
  demo.set('noRole', false);
  demo.set('isService', true);
};
demo._setClient = () => {
  demo.set('noRole', false);
  demo.set('isClient', true);
};
demo._runService = () => {
  demo.$.service.publish();
};
demo._onServiceCreated = () => {
  demo.set('serviceCreated', true);
};
demo._searchBluetoothDevices = () => {
  demo.$.adapter.startDiscovery();
};
demo._getDeviceName = (device) => device.name || device.address;
