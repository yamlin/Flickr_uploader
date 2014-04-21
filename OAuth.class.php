<?php

$obj = new FlickrOAuth();
$method = $_GET['method'];

if ($method== 'request_token'){
	$key = $_GET['key'];
	$secret = $_GET['secret'];
	$callback = $_GET['callback'];
	$ret = $obj->requestToken($key, $secret, $callback);
	echo $ret;
} else if($method == 'access_token'){
	$key = $_GET['key'];
	$secret = $_GET['secret'];
	$token = $_GET['token'];
	$tokenSecret = $_GET['tokenSecret'];
	$verifier = $_GET['verifier'] ;
	$ret = $obj->accessToken($key, $secret, $token, $tokenSecret, $verifier);
	echo $ret;
}


class FlickrOAuth {	
	const FLICKR_REQUEST_TOKEN_URL = 
			"http://www.flickr.com/services/oauth/request_token";
	const FLICKR_AUTHORIZE_URL = 
			"http://www.flickr.com/services/oauth/authorize";	
	const FLICKR_ACCESS_TOKEN_URL = 
			"http://www.flickr.com/services/oauth/access_token";
	const FLICKR_SERVICE_URL =
			"http://ycpi.api.flickr.com/services/rest";
	const FLICKR_UPLOAD_URL =
			"http://www.flickr.com/services/upload/";
					 
	private static function getRandomStr($len=10){
		$str = "0123456789abcdefghijklmnopqrstuvwxyz";
		$strlen = strlen($str);
		$rand = "";
		for($i = 0; $i < $len; $i++){
			$rand .= mt_rand(0, $strlen-1);
		}
		return $rand;
	}
	
	private static function genBaseString($method, $url, $params){
		return sprintf("%s&%s&%s", $method, urlencode($url),
				urlencode(http_build_query($params)));
	}
	
	private static function send($url, $method, $params) {
		
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_TIMEOUT, 10);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		
		if ($method == "POST") {
			curl_setopt($ch, CURLOPT_URL, $url);
			curl_setopt($ch, CURLOPT_POST, true);
			curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
		} else {
			$h = array();		
			foreach ($params as $key=> $value) {
				$h[] = sprintf("%s=%s", $key, $value);		    
			}
			curl_setopt($ch, CURLOPT_URL, $url."?".implode("&", $h));		
		}
		$res = curl_exec($ch);
		curl_close($ch);	
		return $res;	
	}
		
	public function service($consumerKey=false, $secret=false, $token=false,
		$tokenSecret=false,	$method=false, $methodParams=array()){
			
		if(empty($consumerKey) || empty($token) || empty($method) ||
			empty($tokenSecret) || empty($secret)){
			echo json_encode(array("msg" => "Parameter error!"));
			return;
		}
		
		$default = array(
			'method' => $method,
			'nojsoncallback' => "1",
			'format' => 'json',			
			'oauth_consumer_key' => $consumerKey,
			'oauth_nonce' => self::getRandomStr(10),
			'oauth_signature_method' => 'HMAC-SHA1',
			'oauth_timestamp' => time(),
			'oauth_token' => $token,			
			'oauth_version' => '1.0',
		);
		
				
		//merge then sort the keys
		$params = array_merge($default, $methodParams);
		ksort($params); 
		$key = urlencode($secret).'&'.urlencode($tokenSecret);
		$method = 'GET';
		$base_string = self::genBaseString($method, 
				self::FLICKR_SERVICE_URL, $params);
				
		$signature = base64_encode(hash_hmac("sha1", $base_string, $key, true));
		
		$params['oauth_signature'] = urlencode($signature);
		
		
		//request the token		
		$res = self::send(self::FLICKR_SERVICE_URL, $method, $params);		
			
		return $res;
	}
	
	public function accessToken($consumerKey=false, $secret=false, 
		$token=false, $tokenSecret=false, $verifier=false) {
			
		if(empty($consumerKey) || empty($secret) || empty($token) || 
			empty($tokenSecret) || empty($verifier)){
			echo json_encode(array("msg" => "Parameter error!"));
			return;
		}	
			
		$params = array(			
			'oauth_consumer_key' => $consumerKey,
			'oauth_nonce' => self::getRandomStr(10),
			'oauth_signature_method' => 'HMAC-SHA1',
			'oauth_timestamp' => time(),
			'oauth_token' => $token,
			'oauth_verifier' => $verifier,
			'oauth_version' => '1.0',
		);
			
		$key = urlencode($secret).'&'.urlencode($tokenSecret);
		$method = 'GET';
		$base_string = self::genBaseString($method, 
				self::FLICKR_ACCESS_TOKEN_URL, $params);
				
		$signature = base64_encode(hash_hmac("sha1", $base_string, $key, true));
		
		$params['oauth_signature'] = urlencode($signature);
		
		
		//request the token		
		$res = self::send(
			self::FLICKR_ACCESS_TOKEN_URL, $method, $params);		
			
		$tokens = explode("&", $res);
		
		$ret = array();
		for ($i = 0; $i < count($tokens); $i++){
			$tmp = explode("=", $tokens[$i]);
			if($tmp[0] == "oauth_token") $ret[$tmp[0]] = $tmp[1];
			if($tmp[0] == "oauth_token_secret") $ret[$tmp[0]] = $tmp[1];
		}
		
		if(array_key_exists("oauth_token", $ret) && 
			array_key_exists("oauth_token_secret", $ret)){
			$ret["msg"] = "OK";
			return json_encode($ret);		
		} else {
			return json_encode(array("msg" => "fail"));
		}
	}
	
	
	public function requestToken($consumerKey=false, $secret=false,
			 $callback=false){
				
		if(empty($consumerKey) || empty($secret) || empty($callback)){
			echo json_encode(array("msg" => "Parameter error!"));
			return;
		}	
			
		$params = array(
		    'oauth_callback' =>		$callback,
		    'oauth_consumer_key' => $consumerKey,
		    'oauth_nonce' =>		self::getRandomStr(10),
		    'oauth_signature_method' => 'HMAC-SHA1',
		    'oauth_timestamp' =>	time(),
		    'oauth_version' =>		'1.0',
		);
		
		$key = urlencode($secret).'&';
		$method = 'GET';
		$base_string = self::genBaseString($method, 
				self::FLICKR_REQUEST_TOKEN_URL, $params);
				
		$signature = base64_encode(hash_hmac("sha1", $base_string, $key, true));
		
		$params['oauth_signature'] = urlencode($signature);
		
		
		//request the token		
		$res = self::send(self::FLICKR_REQUEST_TOKEN_URL, $method, $params);
		
		
		if(preg_match_all("/(oauth_callback_confirmed|oauth_token|oauth_token_secret)=([a-z0-9\-]*)/i", $res, $m)){
			$authUrl =  self::FLICKR_AUTHORIZE_URL."?oauth_token=".$m[2][1];
			echo json_encode(array("msg" => "OK", "auth_url" => $authUrl, 
					"token" => $m[2][1], "secret" => $m[2][2]));	
		} else{
			echo json_encode(array("msg" => "fail"));		
		}
	}
}
?>
