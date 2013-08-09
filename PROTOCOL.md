ChronoSync Digest Algorithm
===========================

Digest Tree
-----------

ChronoSync constructs a digest tree to represent the information about all the users. The digest tree consists of a root node and several leaf nodes at the second level of the tree. Each leaf node contains information about a specific user, including its NDN name, session id and sequence number. The tree structure is shown in the following figure:

                           ----------
                           |  root  |
			   ----------
			   /    |    \
			  /     |     \
		    --------
		    | leaf |    ...
		    --------
		      /  \
		     /    \
           ----------      ---------
	   | prefix |      | seqno |
	   ----------      ---------
	                     /   \
			    /     \
		  -----------     -------
		  | session |     | seq |
		  -----------     -------


Prefix and Session ID Generation
--------------------------------

The prefix is generated as Routable_prefix/Chatroom_name/Random_string. The last component is a 10-character random string. It is automatically generated when the chat application starts. The session id corresponds to the curent system time (in seconds) when the chat application starts.


Digest Algorithm
----------------

To sync with other users, ChronoSync needs to compute a digest on the information stored in digest tree. Keeping a consistent digest algorithm across all the ChronoSync instances is extremely important (otherwise ChronoSync wouldn't work). In the current implementation of ChronoChat/ChronoSync, SHA256 hashing function is used and the digest is computed as follows:

* The root digest is computed as HASH( leaf[0].digest || leaf[1].digest || ... || leaf[n].digest ). The leaves are sorted in lexicographic order on their prefixes.
* The leaf digest is computed as HASH( prefix_digest || seqno_digest )
* The prefix digest is computed as HASH( prefix ), where the prefix is ASCII-encoded byte array of the NDN name (in URI format).
* The seqno digest is computed as HASH( session || seq ), where both session and seq are 4-byte arrays represent the 32bit integers in host byte order.


