ChronoChat-js
=============

ChronoChat-js is a javacript version of ChronoChat based on NDN-js and ChronoSync.

Get Started
-----------

ChronoChat-js does not require any installation just open the file: chrono.html on a browser and then you can use it.



Main File Info
--------------

There are five parts of the source code:
* NDN.JS:
  'ndn.js' for NDN.JS from https://github.com/wentaoshang/NDN.JS
* ChronoSync:
  'Sync.js' for sync interest and data processing
  'digest_tree.js' for digest tree in ChronoSync
* ChronoChat:
  'Chat.js' for shat interest and data processing as well as other action like leave and heartbeat
  'start.js' for initialization of the application
* Protobuf:
  'sync_state.js':for sync data packet
  'chatbuf.js':for chat data packet
  ./Protobuf is the Protobuf for javascript from https://github.com/dcodeIO/ProtoBuf.js/pull/3
* Webpage:
  'chrono.html' for web page
  'page.css' for css file of the page


Notice
------


API
---
