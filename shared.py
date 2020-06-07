saved_songs_ID = []
saved_artists_ID = []

played_songs_ID = []
played_artists_ID = []

top_songs_ID = []
top_artists_ID = []

saved_songs_info = []
played_songs_info = []
top_songs_info = []

saved_songs_features = []
played_songs_features = []
top_songs_features = []

recommended_top_genres_tracks_album_src = []
recommended_top_tracks_album_src = []

recommended_top_genres_tracks_url = []
recommended_top_tracks_url = []

recommended_top_genres_tracks_ID = []
recommended_top_tracks_ID = []

recommended_top_genres_tracks_info = []
recommended_top_tracks_info = []

recommended_top_genres_tracks_features = []
recommended_top_tracks_features = []

genres_count = {}

features_value_range = {
    'acousticness':      [0, 1, 'Confidence measure of whether the track is acoustic'],
    'danceability':      [0, 1, 'How suitable a track is for dancing based on tempo, rhythm stability, beat strength, and overall regularity'],
    'energy':            [0, 1, 'Perceptual measure of intensity and activity based on loudness, timbre, onset rate, and general entropy'],
    'instrumentalness':  [0, 1, 'Confidence measure of whether a track contains no vocals'],
    # 'key':               [0, 12, 'The key the track is in, using standard Pitch Class notation'],
    'liveness': 		 [0, 1, 'Probability that the track was performed live'],
    'loudness': 		 [-60, 0, 'The overall loudness of a track in decibels'],
    # 'mode': 			 [0, 1, 'The modality of a track, major represented with 1 and minor with 0'],
    'speechiness':       [0, 1, 'The presence of spoken words in a track'],
    'tempo': 			       [50, 200, 'Estimated tempo of a track in beats per minute (BPM)'],
    'valence': 			     [0, 1, 'A measure from 0.0 to 1.0 describing the musical positiveness conveyed by a track']
}