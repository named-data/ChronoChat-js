//digest tree

var Digest_Tree = function Digest_Tree() {
    this.digestnode = [];
    this.root = '0000';
};

Digest_Tree.prototype.initial = function() {
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(usrname+0);
    this.digestnode[0] = {"prefix_name":usrname,"seqno":0,"digest":md.digest()};
    md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(this.digestnode[0].digest);
    this.root = md.digest();
    
};

Digest_Tree.prototype.newcomer = function(name,seqno,self){
    var digest_t = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    if(name == usrname){
    	self.usrseq = seqno;
    }
    digest_t.updateString(name+seqno);
    var temp = {"prefix_name":name,"seqno":seqno,"digest":digest_t.digest()};
    console.log("new comer "+name+','+seqno);
    console.log(temp);
    this.digestnode.push(temp);
    this.digestnode.sort(sortdigestnode);
    console.log("sort digest");
    var root_d = '';
    for(var i = 0;i<this.digestnode.length;i++){
	root_d = root_d+this.digestnode[i].digest;
    }
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(root_d);
    this.root = md.digest();
};

Digest_Tree.prototype.update = function (content,self) {
    //console.log(content[0].seqno);
    //console.log("tree update content:");
    //console.log(content);
    for(var i = 0;i<content.length;i++){
	var n_index = this.find(content[i].name);
	//console.log("n_index:"+n_index);
        if( n_index != -1){
	    //only update the newer status
	    if(this.digestnode[n_index].seqno<content[i].seqno){
                if(content[i].name == usrname){
		    self.usrseq = content[i].seqno;
            	}
		this.digestnode[n_index].seqno =content[i].seqno;
		this.digestnode[n_index].prefix_name = content[i].name;
		var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
		md.updateString(this.digestnode[n_index].prefix_name+this.digestnode[n_index].seqno);
		this.digestnode[n_index].digest =md.digest();
		var name = content[i].name;
		var seqno = content[i].seqno;
            }
	}
        else{
            this.newcomer(content[i].name,content[i].seqno,self);
        }
    }
    var root_d = '';
    for(var i = 0;i<this.digestnode.length;i++){
	root_d = root_d+this.digestnode[i].digest;
    }
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(root_d);
    this.root = md.digest();
    console.log("update root to: "+this.root);
    usrdigest = this.root;
};

function sortdigestnode(node1,node2){
    if(node1.prefix_name>node2.prefix_name)
	return 1;
    else
	return -1;
}

Digest_Tree.prototype.find = function (name) {
    for (var i = 0;i<this.digestnode.length;i++){
        if(this.digestnode[i].prefix_name == name){
            return i;
        }
    }
    return -1;
};
