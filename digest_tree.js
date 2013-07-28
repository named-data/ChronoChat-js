//digest tree
//var roster = ["Alice","Bob","Cathy"];
//var deqno = [0,0,0];
//the digest_tree input is the new information to put into it

var Digest_Tree = function Digest_Tree() {
    this.digestnode = [];
    this.root = '';
    var root_d = '';
};

Digest_Tree.prototype.initial = function() {
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(usrname+1);
    this.digestnode[0] = {"prefix_name":usrname,"seqno":1,"digest":md.digest()};
    md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(this.digestnode[0].digest);
    this.root = md.digest();
    //usrdigest = md.digest();
    usrseq = 1;
};

Digest_Tree.prototype.newcomer = function(name){
    //console.log("name");
    //console.log(name);
    var digest_t = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    digest_t.updateString(name+1);
    var temp = {"prefix_name":name,"seqno":1,"digest":digest_t.digest()};
    this.digestnode.push(temp);
    this.digestnode.sort(sortdigestnode);
    var root_d = '';
    for(var i = 0;i<this.digestnode.length;i++){
	root_d = root_d+this.digestnode[i].digest;
    }
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(root_d);
    this.root = md.digest();
    roster.push({"name":name,"chat_count":0});
    
};

Digest_Tree.prototype.update = function (content) {
    //console.log(content[0].seqno);////////
    //console.log("tree update content:");
    //console.log(content);
    for(var i = 0;i<content.length;i++){
	var n_index = this.find(content[i].name);
	//console.log("n_index:"+n_index);
        if( n_index != -1){
	    if(content[i].seqno == "unavailable"){
		this.remove(content[i].name);
	    }
	    else{
		this.digestnode[n_index].seqno =content[i].seqno;
		var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
		md.updateString(this.digestnode[n_index].prefix_name+this.digestnode[n_index].seqno);
		this.digestnode[n_index].digest =md.digest();
            }
	}
        else{
            this.newcomer(content[i].name);
        }
    }
    var root_d = '';
    for(var i = 0;i<this.digestnode.length;i++){
	root_d = root_d+this.digestnode[i].digest;
    }
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(root_d);
    //console.log("update"+md.digest());
    this.root = md.digest();
    usrdigest = this.root;
};

function sortdigestnode(node1,node2){
    return(node1.prefix_name>node2.prefix_name);
}

Digest_Tree.prototype.find = function (name) {
    for (var i = 0;i<this.digestnode.length;i++){
        if(this.digestnode[i].prefix_name == name){
            return i;
        }
    }
    if(i == this.digestnode.length)
	return -1;
};

Digest_Tree.prototype.remove = function(name){
    var n = this.find(name);
    this.digestnode.splice(n,1);
    roster.splice(n,1);
};
