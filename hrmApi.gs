var restHrmMethods = {
  'home':{
    'root'               : 'home',
    'login'              : {method: 'post', action: '/api/account/login'} //body {"username":"", "password":""}
  },
  'hrm':{
    'root'               : 'hr',
    'userInfo'           : {action: '/api/employees/ReturnInfoUserLogin'}
  }
}

/**
 * Test HRM API connection with provided settings.
 * @return {object}  Object({status:[boolean], response:[string]})
 */
function testHrmConnection() {
  var req = new RequestHrm, response;

  var ok = function(responseData, httpResponse, statusCode) {
    response = 'Connection successfully established.';
    //Logger.log('%s to server [%s] %s', response);
    setCfg('hrm_available', true);
    setCfg('hrm_token', responseData.accessToken)
  };

  var error = function(responseData, httpResponse, statusCode) {
    response = 'Could not connect to Hrm Server!' + '['+statusCode+']';
    Logger.warn('%s Server [%s] %s', response);
    setCfg('hrm_available', false);
  };

  req.login()
    .withSuccessHandler(ok)
    .withFailureHandler(error);

  return {status: (getCfg('hrm_available')=='true'), response: response};
};

/**
 * Class Request
 * Performs an request to Jira RESTfull API.
 */
function RequestHrm() {
  var statusCode, httpResponse, responseData,
      available, com_domain, url, home_url, hrm_url, username, password,
      hrm_token,hrm_empid
      hrmAction = null,
      hrmQueryParams = {};

  this.init = function() {
    available = getCfg('hrm_available');
    com_domain = getCfg('company_domain');
    username = getCfg('hrm_username');
    password = getCfg('hrm_password');
    hrm_token = getCfg('hrm_accesstoken');
    hrm_empid = getCfg('hrm_empid');
    hrmAction = null;
  };
  
  this.login = function(){
    
    home_url = 'https://' + restHrmMethods['home']['root'] + '.' + com_domain;
    hrmAction = restHrmMethods['home']['login'].action;
    
    url = home_url + hrmAction;
    
    var timingLabel = 'HrmApi call('+hrmAction+')';
    debug.time(timingLabel);
    
    var data = {
      'username' : username,
      'password' : password,
      'rememberMe' : true
    };
    
    var options = {
      'method'      : 'post',
      'contentType' : 'application/json',
      'payload'     : JSON.stringify(data)
    };
    
    try {
      httpResponse = UrlFetchApp.fetch(url, options);
      statusCode = parseInt( httpResponse.getResponseCode() );
    } catch (e) {
      debug.error('UrlFetchApp.fetch(%s) yielded an error: ' + e, url);
      statusCode = 500;
    }
    
    if (httpResponse) {
      try {
        // we care about json response content only
        responseData = JSON.parse(httpResponse.getContentText());
      } catch(e) {
        if(httpErrorCodes[statusCode]) responseData = httpErrorCodes[statusCode];
        else responseData = 'Unable to make requests to Jira (02)!';
      }
    } else {
      responseData = 'Unable to make requests to Jira (01)!';
    }

    if( typeof responseData == 'string' ) {
      responseData = {errorMessages: [responseData]};
      statusCode = 500;
    }

    debug.timeEnd(timingLabel);

    return this;
    
  };

  /**
   * @desc API request Success handler
   * @param fn {function}  Method to call on successfull api request
   * @return {this}  Allow chaining
   */
  this.withSuccessHandler = function(fn) {
    if(statusCode === 200) {
      fn.call(this, responseData, httpResponse, statusCode);
    }
    return this;
  };

  /**
   * @desc API request Failure handler
   * @param fn {function}  Method to call on failed api request
   * @return {this}  Allow chaining
   */
  this.withFailureHandler = function(fn) {
    if(statusCode !== 200) {
      fn.call(this, responseData, httpResponse, statusCode);
    }
    return this;
  };

  /**
   * @desc Return raw response object from previous call.
   * @return {Object}    Response object: {respData: {..}, httpResp: {}, statusCode: Integer}
   */
  this.getResponse = function() {
    return {'respData': responseData, 'httpResp': httpResponse, 'statusCode': statusCode};
  };

  // call init
  this.init();
}
