//digest tree
//var roster = ["Alice","Bob","Cathy"];
//var deqno = [0,0,0];
//the digest_tree input is the new information to put into it

var Digest_Tree = function Digest_Tree() {
    this.digestnode = [];
    this.root = '0000';
    var root_d = '';
};

Digest_Tree.prototype.initial = function() {
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(usrname+0);
    this.digestnode[0] = {"prefix_name":usrname,"seqno":0,"digest":md.digest()};
    md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(this.digestnode[0].digest);
    this.root = md.digest();
    roster[0] = usrname;
    //usrdigest = md.digest();
    usrseq = 0;
};

Digest_Tree.prototype.newcomer = function(name,seqno){
    console.log("new comer name seqno"+name+seqno);
    var digest_t = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    if(name == usrname){
    	usrseq = seqno;
    }
    digest_t.updateString(name+seqno);
    var temp = {"prefix_name":name,"seqno":seqno,"digest":digest_t.digest()};
    this.digestnode.push(temp);
    console.log(digest_tree);
    this.digestnode.sort(sortdigestnode);
    console.log(digest_tree);
    console.log("sort digest");
    roster.push(name);
    roster.sort();
    document.getElementById('menu').innerHTML = '<p><b>Member</b></p>';
    for(var i = 0;i<roster.length;i++){
	document.getElementById('menu').innerHTML += '<p>'+roster[i]+'</p>';
    }
    var root_d = '';
    for(var i = 0;i<this.digestnode.length;i++){
	root_d = root_d+this.digestnode[i].digest;
    }
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(root_d);
    this.root = md.digest();
    if(name!=usrname){
	setTimeout(function(){alive(seqno,name);},120000);
	console.log("set timer");
    }
    //return seqno;
};

Digest_Tree.prototype.update = function (content) {
    //console.log(content[0].seqno);////////
    //console.log("tree update content:");
    //console.log(content);
    for(var i = 0;i<content.length;i++){
	var n_index = this.find(content[i].name);
	//console.log("n_index:"+n_index);
        if( n_index != -1){
	    //only update the newer status
		if(this.digestnode[n_index].seqno<content[i].seqno){
                    if(content[i].name == usrname){
			usrseq = content[i].seqno;
            	    }
		    this.digestnode[n_index].seqno =content[i].seqno;
		    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
		    md.updateString(this.digestnode[n_index].prefix_name+this.digestnode[n_index].seqno);
		    this.digestnode[n_index].digest =md.digest();
		    var name = content[i].name;
		    var seqno = content[i].seqno;
		    if(name!=usrname){
			setTimeout(function(){alive(seqno,name);},120000);
			console.log("set timer");
		    }
            }
	}
        else{
            this.newcomer(content[i].name,content[i].seqno);
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
    //return content;
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
    if(i == this.digestnode.length)
	return -1;
};
