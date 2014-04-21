function $id(name){
	return document.getElementById(name);
}

function $tag(name) {
	return document.getElementsByTagName(name);
}

function $name(name){
	return document.getElementsByName(name);
}



// the file queue
var fileQueue = new Array();

//define the flickr uploader
function Flickr() {
	// used to upload file
	var boundaryString = "7d44e178b0434";
	var uploadURL = 'http://api.flickr.com/services/upload';
	var requestTokenURL = 'http://www.flickr.com/services/oauth/request_token';
	var authorizeURL = 'http://www.flickr.com/services/oauth/authorize';
	var accessTokenURL = 'http://www.flickr.com/services/oauth/access_token';

  	function getRandomStr(){
 		var _str = '0123456789abcdefghijklmnopqrstuvwxyz',
 			len = 10, ret = "";

 		for (var i = 0; i < len; i++) {
 			ret += _str.charAt(Math.floor(Math.random()* _str.length));
 		}
 		return ret;
 	}
  	
  	// string to binary
  	function toBinary(datastr) {
       	function byteValue(x) {
           return x.charCodeAt(0) & 0xff;
       	}
       	var ords = Array.prototype.map.call(datastr, byteValue);
       	return new Uint8Array(ords);
  	}

  	function createHeader(){
    	var boundary = "--" + this.boundaryString;
      	return "multipart/form-data; boundary=" + boundary;
  	}

  	// Create to send
  	function createBody(oauth_keys, binary, name, type){

    	var boundary = '----' + this.boundaryString;

    	var body = "";
    	for( var key in oauth_keys){
      		body += boundary + "\r\n" + 
          		"Content-Disposition: form-data; name=\"" + key + 
          		"\"\r\n\r\n" + oauth_keys[key] + "\r\n";
    	}

    	//add the photo parameter
    	body += boundary + '\r\n';
    	body += 'Content-Disposition: form-data; name="photo"; filename="' +
    		name + '"' + '\r\n' + 'Content-Type: ' + type + '\r\n' +  
          	'\r\n'+ binary + '\r\n';

    	//end boundary
    	body += boundary + "--" + '\r\n';
    	return body;
  	}

  	function createURL(params, url){
  		var ret = url + '?';
  		for (var key in params){
  			ret += key + '=' + params[key] + '&';
  		}
  		return ret.substring(0, ret.length-1);
  	}

  	function completeOauthParameters(params, requestURL, 
		user_secret, access_secret, method) {
	
		var baseStr = function(params) {
			var sortKeys = function(obj) {
				var keys = Object.keys(obj);
				keys.sort();
				return keys;
			}(params);

			// base string requires parameters in alphabetical order
			var baseStr = "";
			for (var i = 0; i < sortKeys.length; i++) {
				baseStr += sortKeys[i] + "=" + params[sortKeys[i]]+ "&";
			}

			// remove the last character '&'
			return baseStr.substring(0, baseStr.length - 1);	
		}(params);
			
		var key = encodeURIComponent(user_secret) + "&" + 
					encodeURIComponent(access_secret);

		// generate signature
		var signature = function(baseStr, requestUrl, key, method) {
			var baseStr = method + "&" +  encodeURIComponent(requestUrl) + 
					"&" + encodeURIComponent(baseStr);	
			// HMAC-SHA1 
			var signature = 
				CryptoJS.HmacSHA1(baseStr, key).toString(CryptoJS.enc.Base64);	
									
			return signature;
		}(baseStr, requestURL, key, method);
		
		params['oauth_signature'] = signature;
		return params;
	}

	function getJSON(url, data, callback){
	    var xhr = createHttpRequest();
	    
	    xhr.onreadystatechange = function() {
	    	if (xhr.readyState == 4){
				if(xhr.status == 200) {			
					var res = JSON.parse(xhr.responseText);
					callback(res);
				} else {
					alert("Error:" + xhr.status);
				}	
	        }  			
	    };

		var requestPath = url+"?"+data;
	    xhr.open("GET", requestPath, true);
	    xhr.send();     
	}

	function getTimeStamp(){
		return ""+ Math.ceil(new Date().getTime()/1000);
	}

	// XHR Cross browser
	function createHttpRequest(){
	    var xhr = null;
	    // for IE7+, Firefox, Chrome, Opera, Safari
	    if (window.XMLHttpRequest) {
	       xhr = new XMLHttpRequest();
	    } else {// code for IE6, IE5
	       xhr = new ActiveXObject("Microsoft.XMLHTTP");
	    }
	    return xhr;
	}

  	this.requestToken = function(oauthInfo, callback){
  		var timeStamp = getTimeStamp();
  		var params = {
		 	oauth_consumer_key : oauthInfo.oauth_consumer_key,
		 	oauth_nonce : getRandomStr(),
		 	oauth_signature_method : "HMAC-SHA1",
		 	oauth_timestamp : timeStamp,
		 	oauth_version: "1.0",		
		 	oauth_callback: encodeURIComponent(oauthInfo.oauth_callback)
		};

		params = completeOauthParameters(params, requestTokenURL, 
			oauthInfo.oauth_user_secret,
		 	oauthInfo.access_secret, 'GET');
		
		for(var key in params) {
			console.log(key + ":" + params[key]);
		}
		console.log(createURL(params, requestTokenURL));
		var xhr = createHttpRequest();
		xhr.onreadystatechange = function(){
			if (xhr.readyState==4){
				if(xhr.status==200 || xhr.status == 201) {			
					console.log(xhr.responseText);
				} else {
					console.log("Error:" + xhr.responseText);
				}
		     }  	
		};
		var url = createURL(params, requestTokenURL);
		console.log(url);
  		xhr.open('GET', url, true);
  		xhr.send();  		
  	}

  	this.accessToken = function(){

  	}

	this.upload = function(img, file, oauthInfo, callback){
		
		var timeStamp = getTimeStamp();
		var params = {
		 	oauth_consumer_key : oauthInfo.oauth_consumer_key,
		 	oauth_nonce : getRandomStr(),
		 	oauth_signature_method : "HMAC-SHA1",
		 	oauth_timestamp : timeStamp,
		 	oauth_token: oauthInfo.access_token,
		 	oauth_version: "1.0",		
		 	title: file.name 
		 };
					
		params = completeOauthParameters(params, uploadURL, 
			oauthInfo.oauth_user_secret,
		 	oauthInfo.access_secret, 'POST');
		
		var xhr = createHttpRequest();
		xhr.open("POST", uploadURL, false);
		//modify the header
		xhr.setRequestHeader("Content-Type", createHeader());
		xhr.onreadystatechange = function() {
		 	if (xhr.readyState==4){
				if(xhr.status==200 || xhr.status == 201) {			
					console.log(xhr.responseText);
				} else {
					console.log("Error:" + xhr.responseText);
				}
		     }  			
		 };
		 
		var body = createBody(params, atob(img), file.name, file.type);
		xhr.send(toBinary(body));
		
	}
}

function getJSON(url, data, callback){
	 var xhr = null;
	 // for IE7+, Firefox, Chrome, Opera, Safari
	    if (window.XMLHttpRequest) {
	       xhr = new XMLHttpRequest();
	    } else {// code for IE6, IE5
	       xhr = new ActiveXObject("Microsoft.XMLHTTP");
	    }
	 
	    xhr.onreadystatechange = function() {
	    	if (xhr.readyState == 4){
				if(xhr.status == 200) {			
					var res = JSON.parse(xhr.responseText);
					callback(res);
				} else {
					alert("Error:" + xhr.status);
				}	
	        }  			
	    };

		var requestPath = url+"?"+data;
	    xhr.open("GET", requestPath, true);
	    xhr.send();     
}

function requestToken(){
	var key = $id("key").value;
	var secret = $id("secret").value;
	if(key != "" && secret !="") {
		sessionStorage['oauth_consumer_key'] = key;
		sessionStorage['oauth_user_secret'] = secret;
		var oauth = {
			oauth_callback: 	window.location.toString(),
			oauth_consumer_key: key, 
			oauth_user_secret: 	secret,
			access_secret: 		""
		};

		var flickr = new Flickr();
		flickr.requestToken(oauth, null);
		/*var url = "OAuth.class.php";
		var data = "method=request_token" +
			"&key=" + key + 
			"&secret=" + secret + 
			"&callback=" + window.location.toString();
		sessionStorage['oauth_consumer_key'] = key;
		sessionStorage['oauth_user_secret'] = secret;	
		getJSON(url, data, function(res){
			sessionStorage['oauth_token_secret'] = res.secret;
			alert("請點選進入 flickr 認證");
			$id("link").innerHTML = 
				'<a href="'	+ res.auth_url + '">進入flickr認證</a>';
		});
		*/		
	}
}

function accessToken(){
	var url = "OAuth.class.php";
	var data = "method=access_token" +
		"&key=" + sessionStorage['oauth_consumer_key'] + 
		"&secret=" + sessionStorage['oauth_user_secret'] +
		"&token=" + sessionStorage['oauth_token'] + 
		"&tokenSecret=" + sessionStorage['oauth_token_secret'] +
		"&verifier=" + sessionStorage['oauth_verifier'] ;
	
	getJSON(url, data, function(res){
		if(res.msg == "OK"){
			sessionStorage['access_token'] = res.oauth_token;
			sessionStorage['access_secret'] = res.oauth_token_secret;
			$id("btnAccess").disabled = true;
			alert("可以上傳照片了");
		}else {
			alert("錯誤");
		}	
	});
}

function uploadImages(){
	if(sessionStorage['access_secret'] === '' || 
		sessionStorage['access_token'] ==='') {
		alert("請先重新取得Access Token!");
		return;
	}

	var OAuthInfo = {
		oauth_consumer_key: sessionStorage['oauth_consumer_key'],
		oauth_user_secret: 	sessionStorage['oauth_user_secret'],
		access_secret: 		sessionStorage['access_secret'],
		access_token:  		sessionStorage['access_token']
	};

	var flickr = new Flickr();
	// check the file queue 
	while(fileQueue.length > 0) {
		var item = fileQueue.pop();
		var img = $id("uploadImg_" + item.name).getAttribute("src")
				.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
		flickr.upload(img, item, OAuthInfo, null);
	}
}

function setDropZone(){
	function parseFile(file){
		// display an image
		if (file.type.indexOf("image") == 0) {		
			var reader = new FileReader();
			reader.onload = function(e) {
				var list = $id("list");
				var uniqueName = "uploadImg_" + file.name; 
				list.innerHTML = list.innerHTML + 
					'<p>File information: <strong>' + file.name + 
					" (" + file.type +")" +					
					"</strong> size: <strong>" + file.size +
					"</strong> bytes</p>" +
					'<img class="thumb" id="'+ uniqueName + 
					'" src="' + e.target.result + '" /><br />';
			}
			reader.readAsDataURL(file);
		}		
	}
	
	// Setup the dnd listeners.
	var dropZone = $id('drop_zone');
	dropZone.addEventListener('dragover', function(evt){
		evt.stopPropagation();
		evt.preventDefault();
		this.className = 'hover';
	}, false);

	dropZone.addEventListener('drop', function(evt){
		evt.stopPropagation();
		evt.preventDefault();

		var files = evt.dataTransfer.files; // FileList object.
		// files is a FileList of File objects. List some properties.
		for (var i = 0, f; f = files[i]; i++) {
			if (!f.type.match('image.*')){
				continue;
			}					
			// add file to file queue
			fileQueue.push({name: f.name, type: f.type});
			parseFile(f);
		}   
	}, false);
}

function initPage(){
	var currUrl = window.location.toString(); 

	if (currUrl.indexOf("?") != -1){ // with parameters => OAuth step 3:
		$id("btnRequest").disabled = true;
		var ary = currUrl.split("?")[1].split("&");
		for(var i in ary){
			var keyVal = ary[i].split("=");
			sessionStorage[keyVal[0]] = keyVal[1];
		}
		$id("key").disabled=true;
		$id("secret").disabled=true;
		sessionStorage['access_token'] = '';
		sessionStorage['access_secret'] = '';

		$id("btnAccess").addEventListener('click', accessToken);		
		$id("submit").addEventListener('click', uploadImages);

	} else { // no parameters => step 1 of OAuth
		sessionStorage.clear(); //remove previous session info
		$id("btnRequest").addEventListener('click', requestToken);
	} 
}

window.onload = function(){
	setDropZone();
	
	initPage();
};