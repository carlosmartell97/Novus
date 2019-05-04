require('dotenv').config()
const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
const url = require('url').URL;
const rp = require('request-promise');

const scopes = [
  'user-read-private', 'user-library-read', 'user-read-recently-played',
  'user-top-read', 'streaming', 'user-read-birthdate', 'user-read-email',
  'user-read-playback-state'];
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


function print_token(body) {
  console.log('\nThe access token is ' + body['access_token'] + '\n');
  console.log('It expires in ' + body['expires_in'] + '\n');
  console.log('The refresh token is ' + body['refresh_token'] + '\n');
}

function remove_double_quotes(s){
  return s.replace(/"/g, '')
}

function artist_with_song(artist, song){
  return remove_double_quotes(artist) + '*' + remove_double_quotes(song);
}

let genres_count = {};
function update_genres_count(artists){
  for(let i=0; i<artists.length; i++){
    let genres = artists[i]['genres'];
    for(let j=0; j<genres.length; j++){
      let genre = genres[j];
      if(genre in genres_count){
        genres_count[genre]++;
      } else {
        genres_count[genre] = 1;
      }
    }
  }
}

function normalize(x, min, max, desired_min, desired_max){
  return (desired_max-desired_min).toFixed(2) / (max-min).toFixed(2) * (x-max).toFixed(2) + desired_max
}

const features_value_range = {
	'acousticness':      [0, 1, 'Confidence measure of whether the track is acoustic'],
	'danceability':      [0, 1, 'How suitable a track is for dancing based on tempo, rhythm stability, beat strength, and overall regularity'],
	'energy':            [0, 1, 'Perceptual measure of intensity and activity based on loudness, timbre, onset rate, and general entropy'],
	'instrumentalness':  [0, 1, 'Confidence measure of whether a track contains no vocals'],
  // 'key':               [0, 12, 'The key the track is in, using standard Pitch Class notation'],
  'liveness': 		     [0, 1, 'Probability that the track was performed live'],
  'loudness': 		     [-60, 0, 'The overall loudness of a track in decibels'],
  // 'mode': 			       [0, 1, 'The modality of a track, major represented with 1 and minor with 0'],
  'speechiness':       [0, 1, 'The presence of spoken words in a track'],
	'tempo': 			       [50, 200, 'Estimated tempo of a track in beats per minute (BPM)'],
	'valence': 			     [0, 1, 'A measure from 0.0 to 1.0 describing the musical positiveness conveyed by a track']
};
function normalize_feature(feature, value){
  let value_range = features_value_range[feature];
  return normalize(value, value_range[0], value_range[1], 0, 1);
}

let results = {};

let saved_songs_info = [];
let played_songs_info = [];
let top_songs_info = [];

let saved_songs_features = [];
let played_songs_features = [];
let top_songs_features = [];

let recommended_top_genres_tracks_album_src = [];
let recommended_top_tracks_album_src = [];

let recommended_top_genres_tracks_url = [];
let recommended_top_tracks_url = [];
/*
    mode 0 -> saved_songs_features
    mode 1 -> played_songs_features
    mode 2 -> top_songs_features
    mode 3 -> recommended_top_genres_tracks_features
    mode 4 -> recommended_top_tracks_features
*/
function update_features(mode, features, songs_info, songs_ID, tipo, songs_album_src, tracks_url){
  for(let i=0; i<features.length; i++){
    let song_info_split = songs_info[i].split('*');
    let new_features = {
      'song_info': artist_with_song(song_info_split[0], song_info_split[1]),
      'track_id': songs_ID[i]
    };
    for(feature in features_value_range){
      new_features[feature] = normalize_feature(feature, features[i][feature]);
      if (!(mode==3 || mode==4)){
        results[tipo][i]['features'].push(
          normalize_feature(feature, features[i][feature])
        );
      }
    }
    if(mode==0){ saved_songs_features.push(new_features); }
    else if(mode==1){ played_songs_features.push(new_features); }
    else if(mode==2){ top_songs_features.push(new_features); }
    else if(mode==3){
      new_features['album_image_src'] = songs_album_src[i];
      new_features['track_url'] = tracks_url[i];
      recommended_top_genres_tracks_features.push(new_features); }
    else if(mode==4){
      new_features['album_image_src'] = songs_album_src[i];
      new_features['track_url'] = tracks_url[i];
      recommended_top_tracks_features.push(new_features); }
  }
}

let recommended_top_genres_tracks_ID = [];
let recommended_top_tracks_ID = [];

let recommended_top_genres_tracks_info = [];
let recommended_top_tracks_info = [];

let recommended_top_genres_tracks_features = [];
let recommended_top_tracks_features = [];
function obtain_word_cloud(success, fail){
  console.log("obtaining word cloud for GENRES...");
  // console.log(genres_count);

  var options = {
    method: 'POST',
    uri: 'http://localhost:8080/wordcloud_and_recommend',
    body: {
      'genres_count': genres_count,
      'display_name': results['display_name'],
      'id': results['id'],
      'features_name': Object.keys(features_value_range),
      'saved_songs_features': saved_songs_features,
      'played_songs_features': played_songs_features,
      'top_songs_features': top_songs_features,
      'recommended_top_genres_tracks_features': recommended_top_genres_tracks_features,
      'recommended_top_tracks_features': recommended_top_tracks_features
    },
    json: true // Automatically stringifies the body to JSON
  };

  rp(options)
  .then(function (response) {
    const word_cloud_src = response['word_cloud_src'];
    const recommendations = response['top_recommendations'];
    const radar_labels = response['radar_labels'];
    const radar_user_values = response['radar_user_values'];
    const radar_recommended_values = response['radar_recommended_values'];
    // console.log("word_cloud_src:" + word_cloud_src);
    // console.log("recommendations:" + recommendations);
    if (response == null){ fail(); }
    else {
      results['word_cloud_src'] = word_cloud_src;
      results['recommended_songs'] = recommendations;
      results['radar_labels'] = radar_labels;
      results['radar_user_values'] = radar_user_values;
      results['radar_recommended_values'] = radar_recommended_values;
      success(results);
    }
  })
  .catch(function (err) { console.log("ERROR:" + err); fail(); });
}

let maximum_seeds_allowed = 5;
function obtain_results(body, success, fail) {
  print_token(body);

  let saved_songs_ID = [];
  let saved_artists_ID = [];

  let played_songs_ID = [];
  let played_artists_ID = [];

  let top_songs_ID = [];
  let top_artists_ID = [];

  // get user info
  spotifyApi.getMe().then(function(data) {
    // console.log(data.body);
    results['country'] = data.body['country'];
    results['display_name'] = data.body['display_name'];
    results['followers'] = data.body['followers']['total'];
    results['id'] = data.body['id'];
    if(data.body['images'].length>0 && 'url' in data.body['images'][0]){
      results['profile_pic'] = data.body['images'][0]['url']; }
    results['type'] = data.body['type'];
    return spotifyApi.getMySavedTracks({limit:50});
  }, function(err) { console.error(err); fail(); })

  // get user's recently SAVED tracks
  .then(function(data) {
    console.log("gathering recently SAVED...");
    // console.log(data.body['items'][0]);
    results['total_saved_songs'] = data.body['total'];
    results['saved_songs'] = [];
    for(let i=0; i<data.body['items'].length; i++) {
      let track = data.body['items'][i]['track'];
      let artist = track['artists'][0];
      results['saved_songs'].push({
        'song_info': artist_with_song(artist['name'], track['name']),
        'track_id': track['id'],
        'album_image_src': track['album']['images'][0]['url'],
        'track_url': track['external_urls']['spotify'],
        'features': []
      });
      saved_songs_ID.push(track['id']);
      saved_artists_ID.push(artist['id']);
      saved_songs_info.push(artist_with_song(artist['name'], track['name']));
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
      let artist = track['artists'][0];
      results['played_songs'].push({
        'song_info': artist_with_song(artist['name'], track['name']),
        'track_id': track['id'],
        'album_image_src': track['album']['images'][0]['url'],
        'track_url': track['external_urls']['spotify'],
        'features': []
      });
      played_songs_ID.push(track['id']);
      played_artists_ID.push(artist['id']);
      played_songs_info.push(artist_with_song(artist['name'], track['name']));
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
      let artist = track['artists'][0];
      results['top_songs'].push({
        'song_info': artist_with_song(artist['name'], track['name']),
        'track_id': track['id'],
        'album_image_src': track['album']['images'][0]['url'],
        'track_url': track['external_urls']['spotify'],
        'features': []
      });
      top_songs_ID.push(track['id']);
      top_artists_ID.push(artist['id']);
      top_songs_info.push(artist_with_song(artist['name'], track['name']));
    }
    return spotifyApi.getAudioFeaturesForTracks(saved_songs_ID);
  }, function(err) { console.error(err); fail(); })

  // get FEATURES for user's SAVED songs
  .then(function(data) {
    console.log("gathering FEATURES for SAVED tracks...");
    let features = data.body['audio_features'];
    // console.log(saved_songs_info[0]);
    // console.log(features[0]);
    update_features(0, features, saved_songs_info, saved_songs_ID, 'saved_songs', null, null);
    return spotifyApi.getAudioFeaturesForTracks(played_songs_ID);
  }, function(err) { console.error(err); fail(); })

  // get FEATURES for user's PLAYED songs
  .then(function(data) {
    console.log("gathering FEATURES for PLAYED tracks...");
    let features = data.body['audio_features'];
    // console.log(played_songs_info[0]);
    // console.log(features[0]);
    update_features(1, features, played_songs_info, played_songs_ID, 'played_songs', null, null);
    return spotifyApi.getAudioFeaturesForTracks(top_songs_ID);
  }, function(err) { console.error(err); fail(); })

  // get FEATURES for user's TOP songs
  .then(function(data) {
    console.log("gathering FEATURES for TOP tracks...");
    let features = data.body['audio_features'];
    // console.log(top_songs_info[0]);
    // console.log(features[0]);
    update_features(2, features, top_songs_info, top_songs_ID, 'top_songs', null, null);
    return spotifyApi.getArtists(saved_artists_ID);
  }, function(err) { console.error(err); fail(); })

  // get ARTISTS for user's SAVED songs
  .then(function(data) {
    console.log("gathering ARTISTS for SAVED songs...");
    // console.log(data.body);
    update_genres_count(data.body['artists']);
    return spotifyApi.getArtists(played_artists_ID);
  }, function(err) { console.error(err); fail(); })

  // get ARTISTS for user's PLAYED songs
  .then(function(data) {
    console.log("gathering ARTISTS for PLAYED songs...");
    // console.log(data.body);
    update_genres_count(data.body['artists']);
    return spotifyApi.getArtists(top_artists_ID);
  }, function(err) { console.error(err); fail(); })

  // get ARTISTS for user's TOP songs
  .then(function(data) {
    console.log("gathering ARTISTS for TOP songs...");
    // console.log(data.body);
    update_genres_count(data.body['artists']);
    return spotifyApi.getAvailableGenreSeeds();
  }, function(err) { console.error(err); fail(); })

  // get available GENRE SEEDS
  .then(function(data) {
    console.log("gathering available GENRE SEEDS");
    // console.log(data.body['genres']);
    let available_genres = data.body['genres'];

    // sort genres
    let genres_count_list = Object.keys(genres_count).map(function(key) {
      return [key, genres_count[key]]; });
    genres_count_list = genres_count_list.sort(function(first, second) {
      return second[1] - first[1]; });
    genres_count_list = Object.keys(genres_count_list).map(function(i) {
      return genres_count_list[i][0]; });
    results['top_genres'] = genres_count_list;

    let top_genres_available = [];
    results['seed_genres_available'] = []
    for(let i=0; i<genres_count_list.length; i++){
      let top_genre = genres_count_list[i];
      let index = available_genres.indexOf(top_genre)
      if(index >= 0){
        results['seed_genres_available'].push(top_genre);
        if(top_genres_available.length < maximum_seeds_allowed){ top_genres_available.push(top_genre); }
      }
    }
    for(let i=0; i<available_genres.length; i++){
      let available_genre = available_genres[i];
      if(results['seed_genres_available'].indexOf(available_genre) < 0){
        results['seed_genres_available'].push(available_genre);
      }
    }
    console.log("top_genres_available: "+top_genres_available);
    return spotifyApi.getRecommendations({ limit:80, seed_genres:top_genres_available, seed_tracks:[], seed_artists:[] });
  }, function(err) { console.error(err); fail(); })

  // get RECOMMENDATIONS with top genres
  .then(function(data){
    console.log("gathering RECOMMENDATIONS with top genres...");
    // console.log(data.body['tracks'][0]['artists'][0]['name']+' - '+data.body['tracks'][0]['name']);
    for(let i=0; i<data.body['tracks'].length; i++){
      let track = data.body['tracks'][i];
      recommended_top_genres_tracks_ID.push(track['id']);
      recommended_top_genres_tracks_info.push(artist_with_song(track['artists'][0]['name'], track['name']));
      recommended_top_genres_tracks_album_src.push(track['album']['images'][0]['url']);
      recommended_top_genres_tracks_url.push(track['external_urls']['spotify']);
    }

    let top_tracks = top_songs_ID.slice(0, maximum_seeds_allowed);
    return spotifyApi.getRecommendations({ limit:80, seed_genres:[], seed_tracks:top_tracks, seed_artists:[] });
  }, function(err) { console.error(err); fail(); })

  // get RECOMMENDATIONS with TOP tracks
  .then(function(data){
    console.log("gathering RECOMMENDATIONS with TOP tracks...");
    // console.log(data.body['tracks'][0]['artists'][0]['name']+' - '+data.body['tracks'][0]['name']);
    for(let i=0; i<data.body['tracks'].length; i++){
      let track = data.body['tracks'][i];
      recommended_top_tracks_ID.push(track['id']);
      recommended_top_tracks_info.push(artist_with_song(track['artists'][0]['name'], track['name']));
      recommended_top_tracks_album_src.push(track['album']['images'][0]['url']);
      recommended_top_tracks_url.push(track['external_urls']['spotify']);
    }
    return spotifyApi.getAudioFeaturesForTracks(recommended_top_genres_tracks_ID);
  }, function(err) { console.error(err); fail(); })

  // get FEATURES for RECOMMENDED top GENRES tracks
  .then(function(data){
    console.log("gathering FEATURES for RECOMMENDED top GENRES tracks...");
    let features = data.body['audio_features'];
    // console.log(features[0]);
    update_features(3, features, recommended_top_genres_tracks_info, recommended_top_genres_tracks_ID,
                    '', recommended_top_genres_tracks_album_src, recommended_top_genres_tracks_url);
    return spotifyApi.getAudioFeaturesForTracks(recommended_top_tracks_ID);
  }, function(err) { console.error(err); fail(); })

  // get FEATURES for RECOMMENDED top TRACKS
  .then(function(data){
    console.log("gathering FEATURES for RECOMMENDED top TRACKS...");
    let features = data.body['audio_features'];
    // console.log(features[0]);
    update_features(4, features, recommended_top_tracks_info, recommended_top_tracks_ID,
                    '', recommended_top_tracks_album_src, recommended_top_tracks_url);
    return spotifyApi.getMyDevices();
  }, function(err) { console.error(err); fail(); })

  // get user's connected DEVICES
  .then(function(data){
    console.log("gathering connected DEVICES...");
    // console.log(data.body['devices']);
    let devices = data.body['devices'];
    for(let i=0; i<devices.length; i++){
      if(devices[i]['is_active']){
        results['device_id'] = devices[i]['id'];
      }
    }

    // obtain word cloud for GENRES
    obtain_word_cloud(function(){
      console.log("Done.");
      success(results);
    }, function(err) { console.error(err); fail(); });
  }, function(err) { console.error(err); fail(); })
  ;
}

app.get('/',function(req, res){
  console.log(req.method + " " + req.route.path);
  res.render('index.html');
});

app.post('/',function(req, res){
  console.log(req.method + " " + req.route.path);
  res.redirect(authorizeURL);
});

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
        function(){
          results['access_token'] = data.body['access_token'];
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
            function(){
              results['access_token'] = data.body['access_token'];
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
  console.log('NOVUS started on http://localhost:' + app.get('port') + ' press Ctrl-C to terminate');
});
