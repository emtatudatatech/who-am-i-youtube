"""
    ------------
    Information
    ------------
    Creator: @emtatudatatech
    Version: 1.0
    Version Date: November 6, 2024
    Purpose: To create a dataset that captures the YouTube channels I am subscribed to.
    Dataset will be a useful fact table (model) for analysis and visualization.
    Source: Google Takeout
    Output: .json file

"""
import logging
import pandas as pd

subs_raw = pd.read_csv("datasets\\subscriptions.csv")

# Creating a copy of this dataset
subscriptions = subs_raw.copy()

subscriptions.head()

try:
    subscriptions.to_json(
        r"datasets\subscriptions.json", 
        index=False
        )
    logging.info("Subscriptions dataset written to datalake.")
except Exception as e:
    logging.error(e)