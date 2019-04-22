require('dotenv').config()
const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
const url = require('url').URL;


const scopes = [
  'user-read-private', 'user-library-read', 'user-read-recently-played',
  'user-top-read'];
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
app.use(express.static(__dirname + '/views'));


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

function remove_double_quotes(s){
  return s.replace(/"/g, '')
}

function obtain_results(body, success, fail) {
  print_token(body);

  results = {}
  // get user info
  spotifyApi.getMe().then(function(data) {
    // console.log(data.body);
    results['country'] = data.body['country'];
    results['display_name'] = data.body['display_name'];
    results['followers'] = data.body['followers']['total'];
    results['id'] = data.body['id'];
    if(data.body['images'].length>0 && 'url' in data.body['images'][0]){
      results['profile_pic'] = data.body['images'][0]['url']; }
    results['product'] = data.body['product'];
    results['type'] = data.body['type'];
    return spotifyApi.getMySavedTracks({limit:50});
  }, function(err) { console.error(err); fail(); })
  // get user's SAVED tracks
  .then(function(data) {
    console.log("gathering recently SAVED...");
    // console.log(data.body['items'][0]);
    results['total_saved_songs'] = data.body['total'];
    results['saved_songs'] = [];
    for(let i=0; i<data.body['items'].length; i++) {
      let track = data.body['items'][i]['track'];
      results['saved_songs'].push(remove_double_quotes(track['artists'][0]['name']) + '*' + remove_double_quotes(track['name']));
    }
    return spotifyApi.getMyRecentlyPlayedTracks({limit:50});
  }, function(err) { console.error(err); fail(); })
  // get user's recently PLAYED tracks
  .then(function(data) {
    console.log("gathering recently PLAYED...");
    // console.log(data.body['items'][0]);
    results['played_songs'] = [];
    for(let i=0; i<data.body['items'].length; i++){
      let track = data.body['items'][i]['track'];
      results['played_songs'].push(remove_double_quotes(track['artists'][0]['name']) + '*' + remove_double_quotes(track['name']));
    }
    return spotifyApi.getMyTopTracks({limit:50, time_range:'short_term'})
  }, function(err) { console.error(err); fail(); })
  // get user's TOP songs
  .then(function(data) {
    console.log("gathering last month's TOP...");
    // console.log(data.body['items'][0]);
    results['top_songs'] = [];
    for(let i=0; i<data.body['items'].length; i++){
      let track = data.body['items'][i];
      results['top_songs'].push(remove_double_quotes(track['artists'][0]['name']) + '*' + remove_double_quotes(track['name']));
    }
    success(results);
  }, function(err) { console.error(err); fail(); });
}

app.get('/home',function(req, res){
  console.log(req.method + " " + req.route.path);

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
