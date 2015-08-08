ChronoChat-js
=============

ChronoChat-js is a javacript version of ChronoChat based on NDN-JS and ChronoSync.

Get Started
-----------
ChronoChat-js does not require any installation. Just open the file: index.html in a browser, input user name, hub prefix and chatroom name, and then start chatting.

You can also try the online demo at http://named-data.net/apps/live/chat/ .  (Try opening two browser tabs with different user names.)

ChronoSync
----------
This uses the NDN-JS ChronoSync2013 protocol which is documented at http://named-data.net/doc/ndn-ccl-api/chrono-sync2013.html .

File Structure
--------------
These are the major parts in the source code package:

1. NDN-JS

* ndn.js: The NDN-JS library source code, including ChronoSync2013.

2. ChronoChat

* chrono-chat.js: chat interest and data processing as well as other actions like leave and heartbeat.

3. Protobuf

* chatbuf.js: The chat data packet format definition.
* Protobuf/: The ProtoBuf.js library source code.

4. Web page

* index.html: The web chat interface.
* page.css: The css file of the web page.

Notes
-----
ChronoChat-js currently does not perform any data authentication. The private key used to encrypt user data packets is hard-coded in ndn-js and shared by all the users on the Web.

License
-------
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
A copy of the GNU Lesser General Public License is in the file COPYING.
