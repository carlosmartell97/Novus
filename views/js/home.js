if(!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}

function add_song_HTML(prefix){
  let songs_div = document.getElementById(prefix+'songs');
  for(let i=0; i<Object.keys(resultsJSON[prefix+'songs']).length; i++){
    let song = resultsJSON[prefix+'songs'][i];
    songs_div.innerHTML += song_HTML_content.format('"'+prefix+'playback'+(i+1)+'"', '"'+prefix+'album'+(i+1)+'"', '"'+prefix+'song'+(i+1)+'"', '"'+prefix+'artist'+(i+1)+'"');
    let song_info = song['song_info'].split('*');
    document.getElementById(prefix+'song'+(i+1)).innerHTML = song_info[1];
    document.getElementById(prefix+'artist'+(i+1)).innerHTML = song_info[0];
    if ('device_id' in resultsJSON){
      document.getElementById(prefix+'playback'+(i+1)).setAttribute("onClick", "play_song('"+resultsJSON['device_id']+"','"+song['track_id']+"')");
    } else {
      document.getElementById(prefix+'playback'+(i+1)).setAttribute("onclick", 'window.open("'+song['track_url']+'","_blank")');
    }
    document.getElementById(prefix+'album'+(i+1)).src = song['album_image_src'];
  }
}

const resultsJSON = JSON.parse(results);
console.log(resultsJSON);
const access_token = resultsJSON['access_token'];

let profile_pic_src = '/img/default_profile_pic.jpeg';
if('profile_pic' in resultsJSON){
  profile_pic_src = resultsJSON['profile_pic'].replace(/amp;/g, ''); }
document.getElementById('profile_pic').src = profile_pic_src;
document.getElementById('display_name').innerHTML = resultsJSON['display_name'];
document.getElementById('id').innerHTML = resultsJSON['id'];
document.getElementById('followers').innerHTML = resultsJSON['followers'];
document.getElementById('total_saved_songs').innerHTML = resultsJSON['total_saved_songs'];
document.getElementById('country').innerHTML = resultsJSON['country'];
document.getElementById('product').innerHTML = resultsJSON['product'];
document.getElementById('type').innerHTML = resultsJSON['type'];

const song_HTML_content =
  `<a id={0} style="text-decoration:none; color:inherit;">
      <div class="row">
          <div class="col-md-1"></div>
          <div class="col-md-2">
              <img class="albumImage" id={1} src="https://i.scdn.co/image/b10a614ced95aff8bf68767ced8bf6180eb663df">
          </div>
          <div class="col-md-8">
              <div style="padding-bottom:15px"><font size="5" id={2}>Song Title</font> <br> <font size="3" id={3}>Song artist</font></div>
          </div>
          <div class="col-md-1"></div>
      </div>
  </a>`;
add_song_HTML("saved_");
add_song_HTML("played_");
add_song_HTML("top_");

if('word_cloud_src' in resultsJSON){
  document.getElementById('word_cloud').src = resultsJSON['word_cloud_src'].replace(/amp;/g, ''); }
let top_genres = document.getElementById('top_genres');
for(let i=0; i<Object.keys(resultsJSON['top_genres']).length; i++){
  top_genres.innerHTML += '<br><font size="3">'+resultsJSON['top_genres'][i]+'</font>';
}
