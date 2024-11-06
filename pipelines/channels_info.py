"""
    ------------
    Information
    ------------
    Creator: @emtatudatatech
    Version: 1.0
    Version Date: November 6, 2024
    Purpose: To create a dataset that captures additional information 
    about the YouTube channels in the whole data model.
    Dataset will be a useful dimension table (model) for analysis and visualization.
    Source: subscriptions.json, watch-history.json, search-history.json
    Output: .json file

"""

import pandas as pd
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 5000)


watch = pd.read_json('datasets\\watch-history.json')

print(watch.head())