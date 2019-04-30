function play_song(device_id, track_id){
  const play = ({
    spotify_uri,
    playerInstance: {
      _options: {
        getOAuthToken,
        id
      }
    }
  }) => {
    // getOAuthToken(access_token => {
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=`+device_id, {
      // fetch(`https://api.spotify.com/v1/me/player/play`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [spotify_uri] }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
      });
      console.log('now playing');
    // });
  };

  play({
    playerInstance: new Spotify.Player({ name: "..." }),
    spotify_uri: 'spotify:track:'+track_id,
  });
}

window.onSpotifyWebPlaybackSDKReady = () => {
  const player = new Spotify.Player({
    name: 'NOVUS Player',
    getOAuthToken: callback => { callback(access_token); },
    volume: 1.0
  });

  // Error handling
  player.addListener('initialization_error', ({ message }) => { console.error(message); });
  player.addListener('authentication_error', ({ message }) => { console.error(message); });
  player.addListener('account_error', ({ message }) => { console.error(message); });
  player.addListener('playback_error', ({ message }) => { console.error(message); });

  // Playback status updates
  player.addListener('player_state_changed', state => { /*console.log(state);*/ });

  // Ready
  player.addListener('ready', ({ device_id }) => {
    // console.log('Ready with Device ID', device_id);
  });

  // Not Ready
  player.addListener('not_ready', ({ device_id }) => {
    // console.log('Device ID has gone offline', device_id);
  });

  // Connect to the player!
  player.connect();
};
