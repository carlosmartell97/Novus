"use strict"
var request = require('request');

class SpApi {
  constructor(access_token){
    this.access_token = access_token;
  }

  configureOptions(url){
    return {
      'url': url,
      'headers': { 'Authorization': 'Bearer ' + this.access_token },
      'json': true,
    };
  }

  configureOptionsWithQs(url, queryStringParameters){
    let options = this.configureOptions(url);
    options['qs'] = queryStringParameters;
    return options;
  }

  getMe(){
    let options = this.configureOptions('https://api.spotify.com/v1/me');
    return new Promise(function(resolve, reject){
      request.get(options, function(error, response, body){
        resolve({
          'body': body
        });
      });
    });
  };

  getMySavedTracks(options){
    console.log('getMySavedTracks()');
    options = this.configureOptionsWithQs('https://api.spotify.com/v1/me/tracks', options);
    return new Promise(function(resolve, reject){
      request.get(options, function(error, response, body){
        resolve({
          'body': body
        });
      });
    });
  };

  getMyRecentlyPlayedTracks(options){
    options = this.configureOptionsWithQs('https://api.spotify.com/v1/me/player/recently-played', options);
    return new Promise(function(resolve, reject){
      request.get(options, function(error, response, body){
        resolve({
          'body': body
        });
      });
    });
  };

  getMyTopTracks(options){
    options = this.configureOptionsWithQs('https://api.spotify.com/v1/me/top/tracks', options);
    return new Promise(function(resolve, reject){
      request.get(options, function(error, response, body){
        resolve({
          'body': body
        });
      });
    });
  };

  getAudioFeaturesForTracks(ids){
    var options = this.configureOptionsWithQs('https://api.spotify.com/v1/audio-features', {'ids': ids.join(',')});
    return new Promise(function(resolve, reject){
      request.get(options, function(error, response, body){
        resolve({
          'body': body
        });
      });
    });
  };

  getArtists(ids){
    var options = this.configureOptionsWithQs('https://api.spotify.com/v1/artists', {'ids': ids.join(',')});
    return new Promise(function(resolve, reject){
      request.get(options, function(error, response, body){
        resolve({
          'body': body
        });
      });
    });
  };

  getAvailableGenreSeeds(ids){
    var options = this.configureOptions('https://api.spotify.com/v1/recommendations/available-genre-seeds');
    return new Promise(function(resolve, reject){
      request.get(options, function(error, response, body){
        resolve({
          'body': body
        });
      });
    });
  };

  getRecommendations(options){
    options = this.configureOptionsWithQs('https://api.spotify.com/v1/recommendations', options);
    console.log(options);
    return new Promise(function(resolve, reject){
      request.get(options, function(error, response, body){
        resolve({
          'body': body,
          'error': error
        });
      });
    });
  };
}

module.exports = SpApi
