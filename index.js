"use strict"
const ethers = require("ethers");
const BStablePool = require('./abi/BStablePool.json');
const BEP20 = require('./abi/BEP20.json');
const BigNumber = require('bignumber.js');
const https = require('https');
const log4js = require('log4js');
const config = require('./conf/conf.js');

log4js.configure(config.log4jsConfig);
const logger = log4js.getLogger('Defistation\'s Data Provider[Mushrooms Finance]');
logger.info('Defistation\'s Data Provider[Mushrooms Finance] start.');

const testSwitchOn = true;
const mushroomsTvlTotalEndpoint = 'swapoodxoh.execute-api.ap-southeast-1.amazonaws.com';
const mushroomsTvlDetailEndpoint = 'vjeieiw4tf.execute-api.us-east-1.amazonaws.com';
const mushroomsFarmingPool = '0x36cb43EB6F5168a1f8310b030a4De6B3B58B4664';

function httpsPostRequest(options, bodyStr){
    let req = https.request(options, (res) => {
        logger.info(`STATUS: ${res.statusCode}, HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            logger.info(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            logger.info('No more data in response.');
        });
    });

    req.on('error', (e) => {
        logger.error(`problem with request: ${e.message}`);
    });

    req.write(bodyStr);
    req.end();
}

async function postTvlReport(reportBody){	

    let clientId = config.default.clientId;
    let clientSecret = config.default.key;
    let auth = 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64');
    let bodyStr = JSON.stringify(reportBody);
    //logger.info(bodyStr);
	
    let headers = {'Authorization': auth, 'Content-Type': 'application/json', 'Content-Length': bodyStr.length};
    let options = {host: 'api.defistation.io', port: 443, path: '/dataProvider/tvl', method: 'POST', headers: headers};	
	
    httpsPostRequest(options, bodyStr);
}

async function readFromMushrooms(_endpoint, _path, _reportBody, _tvlRead){
    const options = {hostname: _endpoint, port: 443, path: _path, method: 'GET', family: 4};

    const req = https.request(options, (res) => {
        //console.log('statusCode:', res.statusCode);
        //console.log('headers:', res.headers);
        res.setEncoding('utf8');

        let _d = '';
        res.on('data', (chunk) => {
            _d += chunk;
        });
		
        res.on('end', () => {                
            let _dStr = JSON.parse(_d.toString());
            //logger.info(JSON.stringify(_dStr));
			
            if(_tvlRead){
               _reportBody['tvl'] = _dStr['result'];			
               //logger.info(JSON.stringify(_reportBody));			   
               readFromMushrooms(mushroomsTvlDetailEndpoint, "/apy?chainId=56", _reportBody, false);
            }else{
               let _data = {"farmingAddress": mushroomsFarmingPool, "farms": [], "vaults": []};
			   
               let _dFarms = _dStr['result']['farms'];
               for(let i = 0;i < _dFarms.length;i++){
                   _data['farms'].push({'lpToken': _dFarms[i]['lpToken'], 'liquidityLocked': _dFarms[i]['liquidity_locked']});
               }
			   
               let _dVaults = _dStr['result']['vaults'];
               for(let j = 0;j < _dVaults.length;j++){
                   _data['vaults'].push({'wantToken': _dVaults[j]['token'], 'address': _dVaults[j]['vault_address'], 'liquidityLocked': _dVaults[j]['liquidity_locked']});
               }
			   
               _reportBody['data'] = _data;
               //logger.info(JSON.stringify(_reportBody));	
               postTvlReport(_reportBody);
            }				
        });
    });

    req.on('error', (e) => {
        console.error(e);
    });
	
    req.end();
}

const mainFunc = async function(){
    let reportBody = {"tvl": 0, "volume": 0, "bnb": 0, "test": testSwitchOn, "data": {}};	
    await readFromMushrooms(mushroomsTvlTotalEndpoint, "/tvl?chainId=56", reportBody, true);
};

mainFunc();

