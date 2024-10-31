"""
    ------------
    Information
    ------------
    Creator: @emtatudatatech
    Version: 1.0
    Version Date: October 31, 2024
    Purpose: To create a dataset that captures the different video categories on YouTube.
    Dataset will be a useful dimension table (model) for analysis and visualization.
    Source: https://mixedanalytics.com/blog/list-of-youtube-video-category-ids/
    Output: .json file

"""
import pandas as pd

categories_map = {
    1 : "Film & Animation",
    2 : "Autos & Vehicles",
    10 : "Music",
    15 : "Pets & Animals",
    17 : "Sports",
    18 : "Short Movies",
    19 : "Travel & Events",
    20 : "Gaming",
    21 : "Videoblogging",
    22 : "People & Blogs",
    23 : "Comedy",
    24 : "Entertainment",
    25 : "News & Politics",
    26 : "Howto & Style",
    27 : "Education",
    28 : "Science & Technology",
    29 : "Nonprofits & Activism",
    30 : "Movies",
    31 : "Anime/Animation",
    32 : "Action/Adventure",
    33 : "Classics",
    34 : "Comedy",
    35 : "Documentary",
    36 : "Drama",
    37 : "Family",
    38 : "Foreign",
    39 : "Horror",
    40 : "Sci-Fi/Fantasy",
    41 : "Thriller",
    42 : "Shorts",
    43 : "Shows",
    44 : "Trailers"
}

categories = pd.DataFrame(
    list(
        categories_map.items()
        ), 
        columns= ["category_id", "category_label"]
        )

assert categories["category_label"].isna().sum() == 0

categories.to_json(
    r"datasets\video_categories.json", 
    index=False
    )