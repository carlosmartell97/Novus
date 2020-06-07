import shared
from utilities import artist_with_song, normalize_feature


def get_features_saved_songs(results, sp):
    features_saved_songs = sp.audio_features(shared.saved_songs_ID)
    print('features saved songs...')
    return update_features(results, 0, features_saved_songs, shared.saved_songs_info, shared.saved_songs_ID, 'saved_songs', None, None)


def get_features_played_songs(results, sp):
    features_played_songs = sp.audio_features(shared.played_songs_ID)
    print('features played songs...')
    return update_features(results, 1, features_played_songs, shared.played_songs_info, shared.played_songs_ID, 'played_songs', None, None)


def get_features_top_songs(results, sp):
    features_top_songs = sp.audio_features(shared.top_songs_ID)
    print('features top songs...')
    return update_features(results, 2, features_top_songs, shared.top_songs_info, shared.top_songs_ID, 'top_songs', None, None)


def get_features_recommended_top_genres(results, sp):
    features = sp.audio_features(shared.recommended_top_genres_tracks_ID)
    print('features recommended top genres...')
    return update_features(results, 3, features, shared.recommended_top_genres_tracks_info,
        shared.recommended_top_genres_tracks_ID, '', shared.recommended_top_genres_tracks_album_src,
        shared.recommended_top_genres_tracks_url)


def get_features_recommended_top_songs(results, sp):
    features = sp.audio_features(shared.recommended_top_tracks_ID)
    print('features recommended top songs...')
    return update_features(results, 4, features, shared.recommended_top_tracks_info,
        shared.recommended_top_tracks_ID, '', shared.recommended_top_tracks_album_src,
        shared.recommended_top_tracks_url)


# mode 0 -> saved_songs_features
# mode 1 -> played_songs_features
# mode 2 -> top_songs_features
# mode 3 -> recommended_top_genres_tracks_features
# mode 4 -> recommended_top_tracks_features
def update_features(results, mode, features, songs_info, songs_ID, tipo, songs_album_src, tracks_url):
    for i,_ in enumerate(features):
        song_info_split = songs_info[i].split('*')
        new_features = {
            'song_info': artist_with_song(song_info_split[0], song_info_split[1]),
            'track_id': songs_ID[i]
        }
        for feature in shared.features_value_range:
            new_features[feature] = normalize_feature(feature, features[i][feature])
            if not (mode==3 or mode==4):
                # print(results[tipo])
                resulting = normalize_feature(feature, features[i][feature])
                results[tipo][i]['features'].append(
                    resulting
                )
        if mode==0:
            shared.saved_songs_features.append(new_features)
        elif mode==1:
            shared.played_songs_features.append(new_features)
        elif mode==2:
            shared.top_songs_features.append(new_features)
        elif mode==3:
            new_features['album_image_src'] = songs_album_src[i]
            new_features['track_url'] = tracks_url[i]
            shared.recommended_top_genres_tracks_features.append(new_features)
        elif mode==4:
            new_features['album_image_src'] = songs_album_src[i]
            new_features['track_url'] = tracks_url[i]
            shared.recommended_top_tracks_features.append(new_features)
    return results