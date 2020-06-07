from flask import Flask, request, redirect, render_template, send_from_directory
from dotenv import load_dotenv
import os
import spotipy
from utilities import ensure_dir, wordcloud, artist_with_song
import json
import shared
import features

load_dotenv()
app = Flask(__name__)
SCOPE = ("user-read-private " "user-library-read " "user-read-recently-played "
  "user-top-read " "streaming " "user-read-birthdate " "user-read-email "
  "user-read-playback-state ")
CLIENT_ID=os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET=os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI=os.getenv("SPOTIFY_REDIRECT_URI")
SP_OAUTH = spotipy.oauth2.SpotifyOAuth(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    redirect_uri=REDIRECT_URI,
    scope=SCOPE,
    cache_path='.spotipy-oauth-cache')

maximum_allowed_seeds = 5


def reset_values():
    shared.saved_songs_ID = []
    shared.saved_artists_ID = []

    shared.played_songs_ID = []
    shared.played_artists_ID = []

    shared.top_songs_ID = []
    shared.top_artists_ID = []

    shared.saved_songs_info = []
    shared.played_songs_info = []
    shared.top_songs_info = []

    shared.saved_songs_features = []
    shared.played_songs_features = []
    shared.top_songs_features = []

    shared.recommended_top_genres_tracks_album_src = []
    shared.recommended_top_tracks_album_src = []

    shared.recommended_top_genres_tracks_url = []
    shared.recommended_top_tracks_url = []

    shared.recommended_top_genres_tracks_ID = []
    shared.recommended_top_tracks_ID = []

    shared.recommended_top_genres_tracks_info = []
    shared.recommended_top_tracks_info = []

    shared.recommended_top_genres_tracks_features = []
    shared.recommended_top_tracks_features = []

    shared.genres_count = {}


@app.route('/')
def login():
    if request.args.get("code"):
        token_info = SP_OAUTH.get_access_token(request.args['code'])
        access_token = token_info['access_token']
        if access_token:
            reset_values()
            return obtain_results(access_token)
    else:
        return htmlForLoginButton()


@app.route("/templates/<path:path>")
def serveStatic(path):
    return send_from_directory('templates', path, cache_timeout=-1)


def obtain_results(access_token):
    sp = spotipy.Spotify(access_token)
    results = {}

    results = get_user_details(results, sp)
    results = get_saved_songs(results, sp)
    results = get_played_songs(results, sp)
    results = get_top_songs(results, sp)
    results = features.get_features_saved_songs(results, sp)
    results = features.get_features_played_songs(results, sp)
    results = features.get_features_top_songs(results, sp)
    update_saved_songs_genres(sp)
    update_played_songs_genres(sp)
    update_top_songs_genres(sp)
    results, top_genres_available = get_available_seeds(results, sp)
    print('top genres available: ' + str(top_genres_available))
    get_recommendations_top_genres(sp, top_genres_available)
    get_recommendations_top_songs(sp)
    results = features.get_features_recommended_top_genres(results, sp)
    results = features.get_features_recommended_top_songs(results, sp)
    results = get_word_cloud(results)

    # print('')
    # print('')
    # print('')
    # print('results:')
    # print(results)
    return render_template('home.html', results=json.dumps(results))


def get_user_details(results, sp):
    user_data = sp.current_user()
    results['user'] = {}
    results['user']['country'] = user_data['country']
    results['user']['display_name'] = user_data['display_name']
    results['user']['followers'] = user_data['followers']['total']
    results['user']['id'] = user_data['id']
    results['user']['type'] = user_data['type']
    user_images = user_data['images']
    if(len(user_images)>0 and 'url' in user_images[0]):
        results['user']['profile_pic'] = user_images[0]['url']

    return results


def get_saved_songs(results, sp):
    saved_songs = sp.current_user_saved_tracks(limit=50)
    results['total_saved_tracks'] = saved_songs['total']
    results['saved_songs'] = []
    for i,track in enumerate(saved_songs['items']):
        track = saved_songs['items'][i]['track']
        artist = track['artists'][0]
        results['saved_songs'].append({
            'song_info': artist_with_song(artist['name'], track['name']),
            'track_id': track['id'],
            'album_image_src': track['album']['images'][0]['url'],
            'track_url': track['external_urls']['spotify'],
            'features': []
        })
        shared.saved_songs_ID.append(track['id'])
        shared.saved_artists_ID.append(artist['id'])
        shared.saved_songs_info.append(artist_with_song(artist['name'], track['name']))
    return results


def get_played_songs(results, sp):
    played_songs = sp.current_user_recently_played(limit=50)
    results['played_songs'] = []
    for i,track in enumerate(played_songs['items']):
        track = played_songs['items'][i]['track']
        artist = track['artists'][0]
        results['played_songs'].append({
            'song_info': artist_with_song(artist['name'], track['name']),
            'track_id': track['id'],
            'album_image_src': track['album']['images'][0]['url'],
            'track_url': track['external_urls']['spotify'],
            'features': []
        })
        shared.played_songs_ID.append(track['id'])
        shared.played_artists_ID.append(artist['id'])
        shared.played_songs_info.append(artist_with_song(artist['name'], track['name']))
    return results


def get_top_songs(results, sp):
    top_songs = sp.current_user_top_tracks(limit=50)
    results['top_songs'] = []
    for i,track in enumerate(top_songs['items']):
        track = top_songs['items'][i]
        artist = track['artists'][0]
        results['top_songs'].append({
            'song_info': artist_with_song(artist['name'], track['name']),
            'track_id': track['id'],
            'album_image_src': track['album']['images'][0]['url'],
            'track_url': track['external_urls']['spotify'],
            'features': []
        })
        shared.top_songs_ID.append(track['id'])
        shared.top_artists_ID.append(artist['id'])
        shared.top_songs_info.append(artist_with_song(artist['name'], track['name']))
    return results


def update_saved_songs_genres(sp):
    saved_songs_artists = sp.artists(shared.saved_artists_ID)
    update_genres_count(saved_songs_artists['artists'])


def update_played_songs_genres(sp):
    played_songs_artists = sp.artists(shared.played_artists_ID)
    update_genres_count(played_songs_artists['artists'])


def update_top_songs_genres(sp):
    top_songs_artists = sp.artists(shared.top_artists_ID)
    update_genres_count(top_songs_artists['artists'])


def get_available_seeds(results, sp):
    available_seeds = sp.recommendation_genre_seeds()['genres']
    global maximum_allowed_seeds
    genres_count_sorted = sorted([(value,key) for (key,value) in shared.genres_count.items()], reverse=True)
    genres_count_sorted_list = list(map((lambda x: x[1]), genres_count_sorted))
    results['top_genres'] = genres_count_sorted_list

    top_genres_available = []
    results['seed_genres_available'] = []
    for top_genre in genres_count_sorted_list:
        if top_genre in available_seeds:
            results['seed_genres_available'].append(top_genre)
            if len(top_genres_available) < maximum_allowed_seeds:
                top_genres_available.append(top_genre)
    for top_genre in genres_count_sorted_list:
        if top_genre not in results['seed_genres_available']:
            results['seed_genres_available'].append(top_genre)

    return results, top_genres_available


def get_recommendations_top_genres(sp, top_genres_available):
    recommendations = sp.recommendations(seed_genres=top_genres_available, limit=50)['tracks']
    for track in recommendations:
        shared.recommended_top_genres_tracks_ID.append(track['id'])
        shared.recommended_top_genres_tracks_info.append(artist_with_song(track['artists'][0]['name'], track['name']))
        shared.recommended_top_genres_tracks_album_src.append(track['album']['images'][0]['url'])
        shared.recommended_top_genres_tracks_url.append(track['external_urls']['spotify'])


def get_recommendations_top_songs(sp):
    recommendations = sp.recommendations(seed_tracks=shared.top_songs_ID[:maximum_allowed_seeds], limit=50)['tracks']
    for track in recommendations:
        shared.recommended_top_tracks_ID.append(track['id'])
        shared.recommended_top_tracks_info.append(artist_with_song(track['artists'][0]['name'], track['name']))
        shared.recommended_top_tracks_album_src.append(track['album']['images'][0]['url'])
        shared.recommended_top_tracks_url.append(track['external_urls']['spotify'])


def get_connected_devices(results, sp):
    devices = sp.devices()['devices']
    for device in devices:
        if device['is_active']:
            results['device_id'] = device['id']
    return results


def get_word_cloud(results):
    word_cloud_src, recommendations, radar_labels, radar_user_values, radar_recommended_values = wordcloud(
        shared.genres_count,
        results['user']['display_name'], results['user']['id'], shared.features_value_range.keys(),
        shared.saved_songs_features, shared.played_songs_features, shared.top_songs_features,
        shared.recommended_top_genres_tracks_features, shared.recommended_top_tracks_features)
    results['word_cloud_src'] = word_cloud_src
    results['recommended_songs'] = recommendations
    results['radar_labels'] = radar_labels
    results['radar_user_values'] = radar_user_values
    results['radar_recommended_values'] = radar_recommended_values
    return results


def update_genres_count(artists):
    for artist in artists:
        genres = artist['genres']
        for genre in genres:
            if genre in shared.genres_count:
                shared.genres_count[genre] += 1
            else:
                shared.genres_count[genre] = 1


def htmlForLoginButton():
    htmlLoginButton = '<input type="button" onclick="window.location.replace(\'{0}\');" value="Redirect">'.format(SP_OAUTH.get_authorize_url())
    return htmlLoginButton


if __name__ == "__main__":
    print("starting...")
    ensure_dir('csv/')
    ensure_dir('views/img/wordcloud/')
    port = int(os.getenv("PORT"))
    app.run(port=port)