from flask import Flask, request, jsonify
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import pandas as pd
import os
from math import *
from decimal import Decimal

app = Flask(__name__)


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


# Function distance between two points and calculate distance value to given root value(p is root value)
p = 1
normalize_coefficient = 100


def p_root(value, root):
	root_value = 1 / float(root)
	return round(Decimal(value) ** Decimal(root_value), p)


def minkowski_distance(x, y, p_value):
	return (p_root(sum(pow(abs(a-b), p_value) for a, b in zip(x, y)), p_value))


def recommend(user_features, recommended_features):
	ignore_columns = ['song_info', 'track_id']

	user_features = user_features.fillna(user_features.mean())
	user_features = user_features.drop(ignore_columns, axis=1)

	user_features_vector = user_features.mean()

	ignored_recommended_features = {}
	recommended_features = recommended_features.fillna(recommended_features.mean())
	ignore_columns.append('album_image_src')
	for column_name in ignore_columns:
		ignored_recommended_features[column_name] = recommended_features[column_name]
	recommended_features = recommended_features.drop(ignore_columns, axis=1)

	# Add column of similarity with the user_features mean.
	recommended_features["similarity_index"] = 0

	for index, row in recommended_features.iterrows():
		similarity_index = minkowski_distance(user_features_vector, row.values, p) / normalize_coefficient
		recommended_features.loc[index, "similarity_index"] = similarity_index

	for column_name in ignore_columns:
		recommended_features[column_name] = ignored_recommended_features[column_name]

	recommendations_clean = recommended_features.drop(['acousticness', 'danceability', 'energy', 'instrumentalness', 'key', 'liveness', 'loudness', 'mode', 'tempo', 'valence'], axis=1)
	recommendations_sorted = recommendations_clean.sort_values('similarity_index', ascending=False)
	top_recommendations = recommendations_sorted.drop_duplicates()[:30]

	return top_recommendations.to_dict('records')


@app.route('/wordcloud_and_recommend', methods=['POST'])
def wordcloud():
	try:
		data = request.get_json()
		genres_count = data['genres_count']
		display_name = data['display_name']
		id = data['id']
		saved_songs_features = data['saved_songs_features']
		played_songs_features = data['played_songs_features']
		top_songs_features = data['top_songs_features']
		recommended_top_genres_tracks_features = data['recommended_top_genres_tracks_features']
		recommended_top_tracks_features = data['recommended_top_tracks_features']
		filename = "img/wordcloud/%s_%s_word_cloud.png" % (display_name, id)
		print('generating WORD CLOUD and RECOMMENDATIONS for %s (%s)...' % (display_name, id))

		wordcloud = WordCloud(background_color='white', max_font_size=40, collocations=False).generate_from_frequencies(genres_count)
		figure = plt.figure(dpi=300)
		plt.imshow(wordcloud, interpolation="bilinear")
		plt.axis("off")
		# plt.show()
		figure.savefig("views/" + filename, bbox_inches='tight', transparent=True, pad_inches=0, dpi=300)

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

		response = {
			'word_cloud_src': filename,
			'top_recommendations': recommend(user_features, recommended_features)
		}
		return jsonify(response)
	except Exception as e:
		print(e)
		return None


if __name__ == "__main__":
	ensure_dir('csv/')
	ensure_dir('views/img/wordcloud/')
	print("starting...")
	app.run(port=8080)
