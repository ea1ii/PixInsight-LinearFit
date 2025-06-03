# PixInsight-LinearFit
This started by challenging myself into PixInsight scripting. It offers some modest degree of automation to the Linear Fit standard process.

Screenshot should be self explanatory but I'll explain.

<p align="center">
<img src="https://github.com/ea1ii/PixInsight-LinearFit/blob/main/screenshot/lFit.jpg" width="400">
</p>

## Instructions

1. Firstly you select if working with two or three images.

2. Use the dropdowns to select the views you want to fit and also the one to be used as reference.

3. If two views only as selected, the script forces into 'User selection' and the selected view is going the be the reference and the other one the linear fitted view.

If three views are selected:
- The reference modes available are User, Mean and Median
- If User is the reference mode, the chosen view is going to be the reference an the remaining two the linear fitted ones.
- If Mean or Median are chosen then, in turn, you can select the scrip to chose as a reference the one with the lowest value, the one with the hisht value or the one in the middle.

4. User can select also if the Linear Fit is going to be applied to the original views or to clones. Clones will have the same name as the original plus the '_LFIT' suffix. If it already exits, numbering will also be added.

5. Adjust Linear Fit parameters as needed.

6. Hit Execute

The script checks that all selected views a monochrome and different, before enabling the Execute button.

Feedback is provided by means of icons, and the Mean and Median values for the selected views are also displayed.

***Disclaimer***

I am aware of the discussions about the view selection for the linear fitting process but, as I wrote above, this was just a coding challenge to myself. Use the flexibiliy or just forget about my script. Anyway, enjoy

And, clear skys!!
