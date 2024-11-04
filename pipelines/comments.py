"""
    ------------
    Information
    ------------
    Creator: @emtatudatatech
    Version: 1.0
    Version Date: November 4, 2024
    Purpose: To create a dataset that captures the different comments 
        I made on different YouTube videos.
    Dataset will be a useful fact table (model) for analysis and visualization.
    Source: Google Takeout
    Output: .json file

"""
import logging
import pandas as pd
import re

comments_raw = pd.read_csv("datasets\\comments.csv")

# Creating a copy of this dataset
comments = comments_raw.copy()

def strip_comment_text(text):
    """
        Function to remove unnecessary characters
        from the comment text to just leave the
        comment. For easy legibility.
    """

    input_text = f'''{text}'''

    # Use regex to find and replace the pattern
    output_text = re.sub(r'{"text":"(.*?)"}', r'\1', input_text)

    # Remove the commas between the sentences
    output_text = output_text.replace('},{', ' ')

    return output_text

# Create a column of stripped column text
comments["Comments"] = comments["Comment Text"].apply(lambda x: strip_comment_text(x))

comments.head()

try:
    comments.to_json(
        r"datasets\comments.json", 
        index=False
        )
    logging.info("Comments dataset written to datalake.")
except Exception as e:
    logging.error(e)