# chrome-bluetooth
A Chrome App's bluetooth API.


For Chrome Apps that use Bluetooth, add the bluetooth entry to the manifest
and specify, if appropriate, the UUIDs of profiles, protocols or services
you wish to implement along with whether you wish to implement these with
the socket and/or Low Energy APIs.

For example for a socket implementation:

    ...
       "bluetooth": {
          "uuids": [ "1105", "1106" ],
          "socket": true
        }
    ...

And for a Low Energy implementation:

    ...
      "bluetooth": {
        "uuids": [ "180D", "1809", "180F" ],
        "low_energy": true
      }
    ...


To only access adapter state, discover nearby devices, and obtain
basic information about devices, only the entry itself is required:

    "bluetooth": { }
    
Example:
    
    <chrome-app-bluetooth 
        id="bluetooth"
        on-device-added="{{onDeviceAdded}}"
        on-device-changed="{{onDeviceChanged}}"
        on-device-removed="{{onDeviceRemoved}}"
        on-state-changed="{{onAdapterStateChanged}}"
        on-error="{{onError}}"
        on-device="{{onDevice}}"
        on-discovery="{{onDiscoveryStateChanged}}"
        ></chrome-app-bluetooth>