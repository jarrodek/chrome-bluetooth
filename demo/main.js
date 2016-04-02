var demo = document.querySelector('template');
demo.isService = false;
demo.isClient = false;
demo.noRole = true;
demo.serviceCreated = false;
demo.addEventListener('dom-change', function() {
  demo.set('uuid', chrome.runtime.getManifest().bluetooth.uuids[0]);

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
demo._closeService = () => {
  demo.$.service.disconnect();
};
demo._onServiceCreated = () => {
  demo.set('serviceCreated', true);
};
demo._serviceDiconnected = () => {
  demo.set('serviceCreated', false);
};
demo._onServiceError = (e) => {
  if (e.detail.message) {
    console.log(e.detail.message);
  }
};
demo._searchBluetoothDevices = () => {
  demo.$.adapter.startDiscovery();
};
demo._getDeviceName = (device) => device.name || device.address;
/**
 * We are interested in one particular UUID of the service that we can handle.
 * Other devices are just other devices available around.
 *
 * @param {Array<String>} uuids A list of service uuids (external device services)
 */
demo._computeDeviceSupported = (uuids) => {
  // console.log('_computeDeviceSupported',(uuids && uuids.indexOf(demo.uuid) !== -1));
  return (uuids && uuids.indexOf(demo.uuid) !== -1);
};
/**
 * Handler for selected device that the user want to connect to.
 * Handler takes address of selected device and sets it in `chrome-bluetooth-socket` element and
 * attempt to connect to the device.
 * @param {ClickEvent} e A click event used to identify list item.
 */
demo._clientDeviceConnect = (e) => {
  var item = demo.$.clientDevicesList.itemForElement(e.target);
  var address = item.address;
  demo.$.socket.address = address;
  demo.$.socket.connect();
};
/**
 * A handler to an event called when the connection to a external device has been made.
 * The socket is now ready to send and receive data.
 * Listen for `message` event to receive a message from the service (external device).
 */
demo._onClientSocketConnected = () => {
  console.log('The client is now connected to the device.');
};

demo._onClientMessageReceived = (e) => {
  console.log('External meesage received from the service.', e);
};

demo._onClientSocketError = (e) => {
  console.error(e);
};
