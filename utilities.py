import matplotlib.pyplot as plt
from wordcloud import WordCloud
import pandas as pd
import os
from math import *
from decimal import Decimal
from shared import features_value_range


def restructure_data(features):
	data = {}
	for track in features:
		for attr in track.keys():
			if attr in data:
				data[attr].append(track[attr])
			else:
				data[attr] = []
	return data


def ensure_dir(file_path):
	directory = os.path.dirname(file_path)
	if not os.path.exists(directory):
		os.makedirs(directory)


# Function distance between two points and calculate distance value to given root value (p is root value)
p = 1
normalize_coefficient = 100


def p_root(value, root):
	root_value = 1 / float(root)
	return round(Decimal(value) ** Decimal(root_value), p)


def minkowski_distance(x, y, p_value):
	return float(p_root(sum(pow(abs(a-b), p_value) for a, b in zip(x, y)), p_value))


def normalize_feature(feature, value):
    value_range = features_value_range[feature]
    return normalize(value, value_range[0], value_range[1], 0, 1)


def normalize(x, min, max, desired_min, desired_max):
    return round(desired_max-desired_min, 2) / round(max-min, 2) * round(x-max, 2) + desired_max


def replace_double_quotes(s):
	return s.replace('"', '\'')


def artist_with_song(artist, song):
    return '{0}*{1}'.format(replace_double_quotes(artist), replace_double_quotes(song))


def recommend(features_name, user_features, recommended_features):
	ignore_columns = ['song_info', 'track_id']

	user_features = user_features.fillna(user_features.mean())
	user_features = user_features.drop(ignore_columns, axis=1)

	user_features_average = user_features.mean()

	ignored_recommended_features = {}
	recommended_features = recommended_features.fillna(recommended_features.mean())
	ignore_columns.extend(('album_image_src', 'track_url'))
	for column_name in ignore_columns:
		ignored_recommended_features[column_name] = recommended_features[column_name]
	recommended_features = recommended_features.drop(ignore_columns, axis=1)

	# Add column of similarity with the user_features mean.
	recommended_features["similarity_index"] = 0

	for index, row in recommended_features.iterrows():
		similarity_index = minkowski_distance(user_features_average, row.values, p) / normalize_coefficient
		recommended_features.loc[index, "similarity_index"] = similarity_index

	for column_name in ignore_columns:
		recommended_features[column_name] = ignored_recommended_features[column_name]

	recommendations_sorted = recommended_features.sort_values('similarity_index', ascending=False)
	top_recommendations = recommendations_sorted.drop_duplicates()[:30]
	recommended_features_average = top_recommendations.drop(['similarity_index'], axis=1).mean()
	recommendations_clean = top_recommendations.drop(features_name, axis=1)

	features_average_labels = list(user_features_average.index)
	user_features_average_values = list(user_features_average.values)
	recommended_features_average_values = list(recommended_features_average.values)

	top_recommendations_features_list = top_recommendations.values.tolist() # had to change from original
	top_recommendations_with_features = recommendations_clean.to_dict('records')
	for i, recommendation in enumerate(top_recommendations_with_features):
		recommendation['features'] = top_recommendations_features_list[i]

	return top_recommendations_with_features, features_average_labels, user_features_average_values, recommended_features_average_values


def wordcloud(genres_count, display_name, id, features_name, saved_songs_features, played_songs_features,
            top_songs_features, recommended_top_genres_tracks_features, recommended_top_tracks_features):
    # try:
    filename = "templates/img/wordcloud/%s_%s_word_cloud.png" % (display_name, id)
    print('generating WORD CLOUD and RECOMMENDATIONS for %s (%s)...' % (display_name, id))

    wordcloud = WordCloud(background_color='white', max_font_size=40, collocations=False).generate_from_frequencies(genres_count)
    figure = plt.figure(dpi=300)
    plt.imshow(wordcloud, interpolation="bilinear")
    plt.axis("off")
    # plt.show()
    figure.savefig(filename, bbox_inches='tight', transparent=True, pad_inches=0, dpi=300)

    # print(genres_count)
    print(len(saved_songs_features))
    print(len(played_songs_features))
    print(len(top_songs_features))
    print(len(recommended_top_genres_tracks_features))
    print(len(recommended_top_tracks_features))

    data_user = restructure_data(saved_songs_features + played_songs_features + top_songs_features)
    user_features = pd.DataFrame(data=data_user)
    print(user_features.shape)
    # df_user.to_csv('csv/%s_%s_user_features.csv' % (display_name, id), encoding='utf-8')
    data_recommended = restructure_data(recommended_top_genres_tracks_features + recommended_top_tracks_features)
    recommended_features = pd.DataFrame(data=data_recommended)
    print(recommended_features.shape)
    # df_recommended.to_csv('csv/%s_%s_recommended_features.csv' % (display_name, id), encoding='utf-8')

    # print('features_name: ' + str(features_name))
    top_recommendations, radar_labels, radar_user_values, radar_recommended_values = recommend(features_name, user_features, recommended_features)

    return filename, top_recommendations, radar_labels, radar_user_values, radar_recommended_values
    # except Exception as e:
    #     print(e)
    #     return None