require('dotenv').config()
const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
const url = require('url').URL;


const scopes = ['user-read-private', 'user-read-email', 'user-library-read'];
const state = 'some-state-of-my-choice';
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});
const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);


const app = express();
app.set('port', process.env.PORT || 3000);
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');


app.get('/',function(req, res){
  console.log(req.method + " " + req.route.path);
  res.render('index.html');
});

app.post('/',function(req, res){
  console.log(req.method + " " + req.route.path);
  res.redirect(authorizeURL);
});

function print_token(body) {
  console.log('\nThe access token is ' + body['access_token'] + '\n');
  console.log('It expires in ' + body['expires_in'] + '\n');
  console.log('The refresh token is ' + body['refresh_token'] + '\n');
}

function obtain_results(body, success, fail) {
  print_token(body);

  results = {}
  spotifyApi.getMe().then(
    function(data) {
      // console.log(data.body);
      results['country'] = data.body['country'];
      results['display_name'] = data.body['display_name'];
      results['followers'] = data.body['followers']['total'];
      results['id'] = data.body['id'];
      results['profile_pic'] = data.body['images'][0]['url'];
      results['product'] = data.body['product'];
      results['type'] = data.body['type'];

      spotifyApi.getMySavedTracks({limit: 10}).then(function(data) {
        // console.log(data.body);
        results['saved_songs'] = data.body['total'];
        for(let i=0; i<10; i++) {
            let track = data.body['items'][i]['track'];
            results['song'+(i+1)] = track['artists'][0]['name'] + ' - ' + track['name'];
        }
        success(results);
      }, function(err) { console.error(err); fail(); });
    }, function(err) { console.error(err); fail(); }
  );
}

app.get('/home',function(req, res){
  console.log(req.method + " " + req.route.path);

  // console.log(req.url);
  const current_url = new url('localhost:' + process.env.PORT + req.url);
  const code = current_url.searchParams.get('code');

  // Retrieve an access token and a refresh token
  spotifyApi.authorizationCodeGrant(code).then(
    function(data) {
      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);

      obtain_results(data.body,
        function(results){
          res.render('home.html', { results:JSON.stringify(results) });
        }, function(){ res.render('error.html'); });
    },
    function(err) {
      console.log('Something went wrong! Refreshing token now...');
      spotifyApi.refreshAccessToken().then(
        function(data) {
          // Save the access token so that it's used in future calls
          spotifyApi.setAccessToken(data.body['access_token']);
          spotifyApi.setRefreshToken(data.body['refresh_token']);
          console.log('The access token has been refreshed!');

          obtain_results(data.body,
            function(results){
              res.render('home.html', { results:JSON.stringify(results) });
            }, function(){ res.render('error.html'); });
        }, function(err) {
          console.log('Could not refresh access token', err);
          res.render('error.html');
        }
      );
    }
  );

});

app.listen(app.get('port'), function(){
  console.log('Express started on http://localhost:' + app.get('port') + ' press Ctrl-C to terminate');
});
