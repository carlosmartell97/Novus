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
      document.getElementById(prefix+'playback'+(i+1)).setAttribute("onClick", "update_song_playing_radar('"+prefix+"',"+i+"); play_song('"+resultsJSON['device_id']+"','"+song['track_id']+"')");
    } else {
      document.getElementById(prefix+'playback'+(i+1)).setAttribute("onclick", "update_song_playing_radar('"+prefix+"',"+i+"); window.open('"+song['track_url']+"','_blank')");
    }
    document.getElementById(prefix+'album'+(i+1)).src = song['album_image_src'];
  }
}

function update_song_playing_radar(prefix, position){
  // console.log(config['data']['datasets'].length);
  let song = resultsJSON[prefix+'songs'][position];

  let new_dataset = {
    label: 'song "'+song['song_info'].split("*")[1]+'"',
    backgroundColor: color(chartColors.blue).alpha(0.2).rgbString(),
    borderColor: chartColors.blue,
    pointBackgroundColor: chartColors.blue,
    data: resultsJSON[prefix+'songs'][position]['features']
  };
  if(config['data']['datasets'].length == 2){
    config['data']['datasets'].push(new_dataset);
  } else {
    config['data']['datasets'][2] = new_dataset;
  }
  myRadarChart.update();
}

window.history.pushState('home', 'NOVUS', '/');

const resultsJSON = JSON.parse(results);
console.log(resultsJSON);
const access_token = resultsJSON['access_token'];
const radar_labels = resultsJSON['radar_labels'];
const radar_user_values = resultsJSON['radar_user_values'];
const radar_recommended_values = resultsJSON['radar_recommended_values'];

let profile_pic_src = 'templates/img/default_profile_pic.jpeg';
if('profile_pic' in resultsJSON['user']){
  profile_pic_src = resultsJSON['user']['profile_pic'].replace(/amp;/g, ''); }
document.getElementById('profile_pic').src = profile_pic_src;
document.getElementById('display_name').innerHTML = resultsJSON['user']['display_name'];
document.getElementById('id').innerHTML = resultsJSON['user']['id'];
document.getElementById('followers').innerHTML = resultsJSON['user']['followers'];
document.getElementById('total_saved_songs').innerHTML = resultsJSON['user']['total_saved_songs'];
document.getElementById('country').innerHTML = resultsJSON['user']['country'];
document.getElementById('type').innerHTML = resultsJSON['user']['type'];

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
add_song_HTML("recommended_");

if('word_cloud_src' in resultsJSON){
  document.getElementById('word_cloud').src = resultsJSON['word_cloud_src'].replace(/amp;/g, ''); }
let top_genres = document.getElementById('top_genres');
if(Object.keys(resultsJSON['top_genres']).length > 0){
  top_genres.innerHTML += resultsJSON['top_genres'][0];
  for(let i=1; i<16; i++){
    if(i==15){
      top_genres.innerHTML += ', ...';
    } else {
      top_genres.innerHTML += ', '+resultsJSON['top_genres'][i];
    }
  }
}

let seed_genres_available = document.getElementById('seed_genres_available');
for(let i=0; i<Object.keys(resultsJSON['seed_genres_available']).length; i++){
  seed_genres_available.innerHTML += '<button type="button" class="btn btn-outline-primary" style="margin:5px">'
    +resultsJSON['seed_genres_available'][i]
  +'</button>';
}

// ___________________________________________________________________
// ___________________________________________________________________
// CHART.JS  _________________________________________________________
// ___________________________________________________________________
const ctx = document.getElementById('myChart').getContext('2d');

const color = Chart.helpers.color;
const chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 220, 60)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};
const data = {
  labels: radar_labels,
  datasets: [{
    label: "average in your tracks",
    backgroundColor: color(chartColors.green).alpha(0.2).rgbString(),
    borderColor: chartColors.green,
    pointBackgroundColor: chartColors.green,
    data: radar_user_values
  },
  {
    label: "average in recommended tracks",
    backgroundColor: color(chartColors.red).alpha(0.2).rgbString(),
    borderColor: chartColors.red,
    pointBackgroundColor: chartColors.red,
    data: radar_recommended_values
  }]
};
const options = {
  responsive: true,
  maintainAspectRatio:true,

  scaleShowLabels: true,
  pointLabelFontFamily : "'Arial'",
  ointLabelFontStyle : "normal",
  //Number - Point label font size in pixels
  pointLabelFontSize : 10,
  //String - Point label font colour
  pointLabelFontColor : "#666",
  //Boolean - Whether to show a dot for each point
  pointDot : true,


  legend: {
    position: 'bottom'
  }
};
const config = {
  type: 'radar',
  data: data,
  options: options
};
const myRadarChart = new Chart(ctx, config);
