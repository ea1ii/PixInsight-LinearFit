#feature-id CGLinearFit : Utilities > CG Linear Fit
#feature-info This script aim to simplify the process of linear fitting a set of images.


/************************************************************************************
 * CGlFit script
 * Version: 1.0
 * Author: Carlos Gil
 *
 * This script is designed to select a group of monochrome views for Linea Fitting
 *
 * If the selection is only two views the user will select which one is the reference
 * and which one will be linear fitted.
 *
 * If more that two views are selected, the mean and median values are calculated.
 * The user then can select:
 * - a specific view to be reference, or
 * - choose either mean or median values to do the selection, and
 * - whether to select the mid one, the lowest one, or the highest one to be used
 *      as a reference.
 * The remaining view will be linear fitted
 *
 * [include license here]
 *
 * COPYWRIGHT © 2025 Carlos Gil. ALL RIGHTS RESERVED.
 ************************************************************************************/

 // includes section
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/ImageOp.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/UndoFlag.jsh>

 // defines section
#define TITLE "CG lFit"
#define VERSION "1.0"
#define DEBUGGING_MODE_ON false

// Enable automatic garbage collection
jsAutoGC = true;

// Function to get all existing image IDs
function getAllImageIDs() {
   let ids = [];
   let windows = ImageWindow.windows;
   for (let i = 0; i < windows.length; ++i) {
      ids.push(windows[i].mainView.id);
   }
   return ids;
}

// Function to find a unique image ID
function findUniqueImageID(baseID) {
   let ids = getAllImageIDs();
   let uniqueID = baseID;
   let count = 1;
   while (ids.indexOf(uniqueID) !== -1) {
      uniqueID = baseID + "_" + ("00" + count).slice(-2);
      count++;
   }
   return uniqueID;
}

function checkImageIsGreyscale(imageId) {
   let window = ImageWindow.windowById(imageId);
   if (window && window.mainView.image.isColor) {
      return false;
   }
   return true;
}

function CGlFitDialog() {

   let v1mean = undefined;
   let v2mean = undefined;
   let v3mean = undefined;
   let v1median = undefined;
   let v2median = undefined;
   let v3median = undefined;

   let v1mono = undefined;
   let v2mono = undefined;
   let v3mono = undefined;



	this.__base__ = Dialog;
   this.__base__();

   this.title = TITLE + " Script";

   // Title Box
   this.titleLabel = new Label(this);
   this.titleLabel.text = TITLE + " V" + VERSION;
   this.titleLabel.textAlignment = TextAlign_Center;
   this.titleLabel.styleSheet = "font-weight: bold; font-size: 14pt; background-color: #f0f0f0;";

	// Instruction Box
   this.instructionLabel = new Label(this);
   this.instructionLabel.text = "Improved Linear Fit\n\nSelect 2 or 3 views. Select the views accordingly (monochrome only).\n\nIf 2 views are felected you can chose the reference view and the other one\nwill be linear fitted.\n\nIf 3 views are selected, then chose:\n - User reference selection and the view to be the reference.\n - Median or Mean value. In this two cases you can select the lowest one,\n   the highest one or the mid one as the reference.\n\nChose to duplicate the views or fit the originals.\n\nAdjust the desired Rejection levels.";
   this.instructionLabel.wordWrapping = true;
   this.instructionLabel.textAlignment = TextAlign_Left;
   this.instructionLabel.frameStyle = FrameStyle_Box;
   this.instructionLabel.styleSheet = "font-size: 10pt; padding: 10px; background-color: #e6e6fa;";

	// Radio buttons for 2 or three views
	this.twoViewsRadioButton = new RadioButton(this);
	this.twoViewsRadioButton.text = "2 views";
	this.twoViewsRadioButton.checked = false;

	this.threeViewsRadioButton = new RadioButton(this);
	this.threeViewsRadioButton.text = "3 views";
	this.threeViewsRadioButton.checked = true;

   this.radioButtonSizer = new GroupBox(this);
   this.radioButtonSizer.sizer = new HorizontalSizer;
   this.radioButtonSizer.sizer.margin = 6;
   this.radioButtonSizer.sizer.spacing = 10;
   this.radioButtonSizer.sizer.add(this.twoViewsRadioButton);
   this.radioButtonSizer.sizer.add(this.threeViewsRadioButton);

	// Function to create dropdowns with labels
   this.createDropDownWithLabel = function(labelText) {
      let sizer = new HorizontalSizer;
      let label = new Label(this);
      label.text = labelText;
      label.textAlignment = TextAlign_Right | TextAlign_VertCenter;
      let comboBox = new ComboBox(this);
      comboBox.editEnabled = false;
      comboBox.addItem("<select view>");

      let windows = ImageWindow.windows;
      for (let i = 0; i < windows.length; ++i) {
         comboBox.addItem(windows[i].mainView.id);
      }

      comboBox.currentItem = 0; // Default to "Select Image"

      sizer.add(label);
      sizer.add(comboBox, 100);
      return { sizer: sizer, comboBox: comboBox }
   }

	// Create dropdowns with labels and store references to the ComboBox elements
	let v1 = this.createDropDownWithLabel("View 1:");
	this.v1sizer = v1.sizer;
	this.v1ComboBox = v1.comboBox;
	this.v1ComboBox.maxWidth = 400;

	let v2 = this.createDropDownWithLabel("View 2:");
	this.v2sizer = v2.sizer;
	this.v2ComboBox = v2.comboBox;
	this.v2ComboBox.maxWidth = 400;

	let v3 = this.createDropDownWithLabel("View 3:");
	this.v3sizer = v3.sizer;
	this.v3ComboBox = v3.comboBox;
	this.v3ComboBox.maxWidth = 400;

   // Create boxes for means and medians
   this.meanv1Box = new Label(this);
   this.meanv1Box.frameStyle = FrameStyle_Box;
   this.meanv1Box.minWidth = 150;
   this.meanv1Box.text = "-----";

   this.medianv1Box = new Label(this)
   this.medianv1Box.frameStyle = FrameStyle_Box;
   this.medianv1Box.minWidth = 150;
   this.medianv1Box.text = "-----";

   this.meanv2Box = new Label(this);
   this.meanv2Box.frameStyle = FrameStyle_Box;
   this.meanv2Box.minWidth = 150;
   this.meanv2Box.text = "-----";

   this.medianv2Box = new Label(this);
   this.medianv2Box.frameStyle = FrameStyle_Box;
   this.medianv2Box.minWidth = 150;
   this.medianv2Box.text = "-----";

   this.meanv3Box = new Label(this);
   this.meanv3Box.frameStyle = FrameStyle_Box;
   this.meanv3Box.minWidth = 150;
   this.meanv3Box.text = "-----";

   this.medianv3Box = new Label(this);
   this.medianv3Box.frameStyle = FrameStyle_Box;
   this.medianv3Box.minWidth = 150;
   this.medianv3Box.text = "------";

   // create indicators
   this.v1RefIndicator = new ToolButton();
   //this.v1RefIndicator.icon = ":/bullets/bullet-triangle-green.png";
   this.v1RefIndicator.toolTip = "View 1 selected as Reference";
   this.v1RefIndicator.icon = "";

   // create indicators
   this.v2RefIndicator = new ToolButton();
   //this.v2RefIndicator.icon = ":/bullets/bullet-triangle-green.png";
   this.v2RefIndicator.toolTip = "View 2 selected as Reference";
   this.v2RefIndicator.icon = "";

   // create indicators
   this.v3RefIndicator = new ToolButton();
   //this.v3RefIndicator.icon = ":/bullets/bullet-triangle-green.png";
   this.v3RefIndicator.toolTip = "View 3 selected as Reference";
   this.v3RefIndicator.icon = "";

   // highest icon: ":/qss/header-up-arrow-dark.png"
   // lowest icon: ":/qss/header-down-arrow-dark.png"

   this.v1MeanIndicator = new ToolButton();
   this.v1MeanIndicator.icon = "";

   this.v2MeanIndicator = new ToolButton();
   this.v2MeanIndicator.icon = "";

   this.v3MeanIndicator = new ToolButton();
   this.v3MeanIndicator.icon = "";

   this.v1MedianIndicator = new ToolButton();
   this.v1MedianIndicator.icon = "";

   this.v2MedianIndicator = new ToolButton();
   this.v2MedianIndicator.icon = "";

   this.v3MedianIndicator = new ToolButton();
   this.v3MedianIndicator.icon = "";

   this.v1MonoIndicator = new ToolButton();
   this.v1MonoIndicator.icon = "";

   this.v2MonoIndicator = new ToolButton();
   this.v2MonoIndicator.icon = "";

   this.v3MonoIndicator = new ToolButton();
   this.v3MonoIndicator.icon = "";

   // Create view groups
   this.v1Sizer = new HorizontalSizer;
   this.v1Sizer.spacing = 10;
   this.v1Sizer.add(this.v1RefIndicator);
   this.v1Sizer.add(this.v1sizer);
   this.v1Sizer.add(this.v1MonoIndicator);
   this.v1Sizer.add(this.meanv1Box);
   this.v1Sizer.add(this.v1MeanIndicator);
   this.v1Sizer.add(this.medianv1Box);
   this.v1Sizer.add(this.v1MedianIndicator);

   this.v2Sizer = new HorizontalSizer;
   this.v2Sizer.spacing = 10;
   this.v2Sizer.add(this.v2RefIndicator);
   this.v2Sizer.add(this.v2sizer);
   this.v2Sizer.add(this.v2MonoIndicator);
   this.v2Sizer.add(this.meanv2Box);
   this.v2Sizer.add(this.v2MeanIndicator);
   this.v2Sizer.add(this.medianv2Box);
   this.v2Sizer.add(this.v2MedianIndicator);

   this.v3Sizer = new HorizontalSizer;
   this.v3Sizer.spacing = 10;
   this.v3Sizer.add(this.v3RefIndicator);
   this.v3Sizer.add(this.v3sizer);
   this.v3Sizer.add(this.v3MonoIndicator);
   this.v3Sizer.add(this.meanv3Box);
   this.v3Sizer.add(this.v3MeanIndicator);
   this.v3Sizer.add(this.medianv3Box);
   this.v3Sizer.add(this.v3MedianIndicator);

   // Create options radio buttons
   //user
   this.userRefRadioButton = new RadioButton(this);
	this.userRefRadioButton.text = "User";
	this.userRefRadioButton.checked = false;
   //mean
   this.meanRefRadioButton = new RadioButton(this);
	this.meanRefRadioButton.text = "Mean";
	this.meanRefRadioButton.checked = false;
   //median
   this.medianRefRadioButton = new RadioButton(this);
	this.medianRefRadioButton.text = "Median";
	this.medianRefRadioButton.checked = false;
   //min
   this.minRefRadioButton = new RadioButton(this);
	this.minRefRadioButton.text = "Minimum";
	this.minRefRadioButton.checked = false;
   //mid
   this.midRefRadioButton = new RadioButton(this);
	this.midRefRadioButton.text = "Middle";
	this.midRefRadioButton.checked = false;
   //max
   this.maxRefRadioButton = new RadioButton(this);
	this.maxRefRadioButton.text = "Maximum";
	this.maxRefRadioButton.checked = false;
   //first
   this.firstRefRadioButton = new RadioButton(this);
	this.firstRefRadioButton.text = "1st";
	this.firstRefRadioButton.checked = false;
   //second
   this.secondRefRadioButton = new RadioButton(this);
	this.secondRefRadioButton.text = "2nd";
	this.secondRefRadioButton.checked = false;
   //third
   this.thirdRefRadioButton = new RadioButton(this);
	this.thirdRefRadioButton.text = "3r";
	this.thirdRefRadioButton.checked = false;

   // numeric inputs
   this.rejectLowNumeric = new NumericControl(this);
   this.rejectLowNumeric.setReal(true);
   this.rejectLowNumeric.setValue(0.0);
   this.rejectLowNumeric.setPrecision(6);
   this.rejectLowNumeric.label.minWidth = 200;
   this.rejectLowNumeric.label.text = "Reject low:";

   this.rejectHighNumeric = new NumericControl(this);
   this.rejectHighNumeric.setReal(true);
   this.rejectHighNumeric.setValue(0.92);
   this.rejectHighNumeric.setPrecision(6);
   this.rejectHighNumeric.label.minWidth = 200;
   this.rejectHighNumeric.label.text = "Reject high:";

   // group numerics
   this.rejectGroup = new GroupBox(this);
   this.rejectGroup.title = "Reject limits";
   this.rejectGroup.sizer = new VerticalSizer;
   this.rejectGroup.sizer.margin = 6;
   this.rejectGroup.sizer.spacing = 4;
   this.rejectGroup.sizer.add(this.rejectLowNumeric);
   this.rejectGroup.sizer.add(this.rejectHighNumeric)

   //new
   this.newCheckBox = new CheckBox(this);
	this.newCheckBox.text = "Create new files";
	this.newCheckBox.checked = false;

   // Execute Button
   this.executeButton = new PushButton(this);
   this.executeButton.enabled = false;
   this.executeButton.text = "Execute";

	// Authorship
   this.authorshipLabel = new Label(this);
   this.authorshipLabel.text = "Written by Carlos Gil\nCopyright 2025";
   this.authorshipLabel.textAlignment = TextAlign_Center;

	// Main Layout
	this.sizer = new VerticalSizer;
	this.sizer.margin = 6;
	this.sizer.spacing = 4;
	this.sizer.add(this.titleLabel);
	this.sizer.add(this.instructionLabel);
	this.sizer.addSpacing(10);

   // Add radio buttons to the layout
   this.sizer.add(this.radioButtonSizer);
   this.sizer.addSpacing(10);

   // Group Labels
   this.groupLabelsSizer = new HorizontalSizer;
   this.groupLabelsSizer.spacing = 6;

   this.viewsGroupLabel = new Label(this);
   this.viewsGroupLabel.text = "Views";
   this.viewsGroupLabel.textAlignment = TextAlign_Center;
   this.viewsGroupLabel.styleSheet = "font-weight: bold;";

	this.meanGroupLabel = new Label(this);
   this.meanGroupLabel.text = "Mean";
   this.meanGroupLabel.minWidth = 200;
   this.meanGroupLabel.textAlignment = TextAlign_Center;
   this.meanGroupLabel.styleSheet = "font-weight: bold;";

	this.medianGroupLabel = new Label(this);
   this.medianGroupLabel.text = "Median";
   this.medianGroupLabel.minWidth = 250;
   this.medianGroupLabel.textAlignment = TextAlign_Center;
   this.medianGroupLabel.styleSheet = "font-weight: bold;";

   this.groupLabelsSizer.addStretch();
   this.groupLabelsSizer.add(this.viewsGroupLabel, 100);
   this.groupLabelsSizer.addStretch();
	this.groupLabelsSizer.add(this.meanGroupLabel, 100);
	this.groupLabelsSizer.add(this.medianGroupLabel, 100);

	this.sizer.add(this.groupLabelsSizer);

   // Add view sizers to layout
   this.sizer.add(this.v1Sizer);
   this.sizer.add(this.v2Sizer);
   this.sizer.add(this.v3Sizer);

   // mode sizer
   this.modeSizer = new GroupBox(this);
   this.modeSizer.title = "Reference mode";
   this.modeSizer.sizer = new HorizontalSizer;
   this.modeSizer.sizer.margin = 6;
   this.modeSizer.sizer.spacing = 4;
   this.modeSizer.sizer.add(this.userRefRadioButton);
   this.modeSizer.sizer.add(this.meanRefRadioButton);
   this.modeSizer.sizer.add(this.medianRefRadioButton);
   this.medianRefRadioButton.checked = true;

   // value sizer
   this.valueSizer = new GroupBox(this);
   this.valueSizer.title = "Reference value";
   this.valueSizer.sizer = new HorizontalSizer;
   this.valueSizer.sizer.margin = 6;
   this.valueSizer.sizer.spacing = 4;
   this.valueSizer.sizer.add(this.minRefRadioButton);
   this.valueSizer.sizer.add(this.midRefRadioButton);
   this.valueSizer.sizer.add(this.maxRefRadioButton);
   this.minRefRadioButton.checked = true;

   // user sizer
   this.userSizer = new GroupBox(this);
   this.userSizer.title = "Reference view";
   this.userSizer.sizer = new HorizontalSizer;
   this.userSizer.sizer.margin = 6;
   this.userSizer.sizer.spacing = 4;
   this.userSizer.sizer.add(this.firstRefRadioButton);
   this.userSizer.sizer.add(this.secondRefRadioButton);
   this.userSizer.sizer.add(this.thirdRefRadioButton);
   this.firstRefRadioButton.checked = true;
   this.firstRefRadioButton.enabled = false;
   this.secondRefRadioButton.enabled = false;
   this.thirdRefRadioButton.enabled = false;

   // add option sizers to layout
   this.sizer.add(this.modeSizer);
   this.sizer.add(this.valueSizer);
   this.sizer.add(this.userSizer);
   this.sizer.add(this.newCheckBox);

   this.sizer.add(this.rejectGroup);

   // Bottom row layout
   this.bottomRowSizer = new HorizontalSizer;
   this.bottomRowSizer.spacing = 6;
   this.bottomRowSizer.add(this.authorshipLabel);
   this.bottomRowSizer.addStretch();
   this.bottomRowSizer.add(this.executeButton);

   this.sizer.add(this.bottomRowSizer);

   this.windowTitle = TITLE + " Script";
   this.adjustToContents();
   this.resizeable = true;

   this.executeButton.onClick = () => {
      this.executeScript();
      // Close the dialog
      this.ok();
   }

   // reactions

   // calculate reference and display icons
   this.refCalculate = function() {
      if (!this.executeButton.enabled) {
         return;
      };

      // calculate mean min and max
      if (this.v1mean < this.v2mean) {
         this.meanMinId = 1;
         this.meanMaxId = 2;
         if (this.threeViewsRadioButton.checked) {
            if (this.v3mean < this.v1mean) {
               this.meanMinId = 3;
            };
            if (this.v3mean > this.v2mean) {
               this.meanMaxId = 3;
            };
         };
      } else {
         this.meanMinId = 2;
         this.meanMaxId = 1;
         if (this.threeViewsRadioButton.checked) {
            if (this.v3mean < this.v2mean) {
               this.meanMinId = 3;
            };
            if (this.v3mean > this.v1mean) {
               this.meanMaxId = 3;
            };
         };
      };

      // calculate median min and max
      if (this.v1median < this.v2median) {
         this.medianMinId = 1;
         this.medianMaxId = 2;
         if (this.threeViewsRadioButton.checked) {
            if (this.v3median < this.v1median) {
               this.medianMinId = 3;
            };
            if (this.v3median > this.v2median) {
               this.medianMaxId = 3;
            };
         };
      } else {
         this.medianMinId = 2;
         this.medianMaxId = 1;
         if (this.threeViewsRadioButton.checked) {
            if (this.v3median < this.v2median) {
               this.medianMinId = 3;
            };
            if (this.v3median > this.v1median) {
               this.medianMaxId = 3;
            };
         };
      };

      // caculate ref
      if (this.userRefRadioButton.checked) {
         if (this.firstRefRadioButton.checked) {
            this.refId = 1;
         } else if (this.secondRefRadioButton.checked) {
            this.refId = 2;
         } else {
           this.refId = 3;
         };
      } else if (this.meanRefRadioButton.checked) {
         if (this.minRefRadioButton.checked) {
            this.refId = this.meanMinId;
         } else if (this.maxRefRadioButton.checked) {
            this.refId = this.meanMaxId;
         } else {
           this.refId = 6 - this.meanMinId - this.meanMaxId;
         };
      } else {
         if (this.minRefRadioButton.checked) {
            this.refId = this.medianMinId;
         } else if (this.maxRefRadioButton.checked) {
            this.refId = this.medianMaxId;
         } else {
            this.refId = 6 - this.medianMinId - this.medianMaxId;
         };
      };

      // display icons
      // ref icons
      if (this.refId == 1) {
         this.v1RefIndicator.icon = ":/bullets/bullet-triangle-green.png";
      } else if (this.refId == 2) {
         this.v2RefIndicator.icon = ":/bullets/bullet-triangle-green.png";
      } else {
         this.v3RefIndicator.icon = ":/bullets/bullet-triangle-green.png";
      };

      // highest icon: ":/qss/header-up-arrow-dark.png"
      // lowest icon: ":/qss/header-down-arrow-dark.png"

      // mean icons
      if (this.meanMaxId == 1) {
         this.v1MeanIndicator.icon = ":/qss/header-up-arrow-dark.png";
      } else if (this.meanMinId == 1) {
         this.v1MeanIndicator.icon = ":/qss/header-down-arrow-dark.png";
      };

      if (this.meanMaxId == 2) {
         this.v2MeanIndicator.icon = ":/qss/header-up-arrow-dark.png";
      } else if (this.meanMinId == 2) {
         this.v2MeanIndicator.icon = ":/qss/header-down-arrow-dark.png";
      };

      if (this.meanMaxId == 3) {
         this.v3MeanIndicator.icon = ":/qss/header-up-arrow-dark.png";
      } else if (this.meanMinId == 3) {
         this.v3MeanIndicator.icon = ":/qss/header-down-arrow-dark.png";
      };

      // median icons
      if (this.medianMaxId == 1) {
         this.v1MedianIndicator.icon = ":/qss/header-up-arrow-dark.png";
      } else if (this.medianMinId == 1) {
         this.v1MedianIndicator.icon = ":/qss/header-down-arrow-dark.png";
      };

      if (this.medianMaxId == 2) {
         this.v2MedianIndicator.icon = ":/qss/header-up-arrow-dark.png";
      } else if (this.medianMinId == 2) {
         this.v2MedianIndicator.icon = ":/qss/header-down-arrow-dark.png";
      };

      if (this.medianMaxId == 3) {
         this.v3MedianIndicator.icon = ":/qss/header-up-arrow-dark.png";
      } else if (this.medianMinId == 3) {
         this.v3MedianIndicator.icon = ":/qss/header-down-arrow-dark.png";
      };
   };

   // check for conditions to execute
   this.canExecute = function() {

      // initially hide all icons
      this.v1RefIndicator.icon = "";
      this.v2RefIndicator.icon = "";
      this.v3RefIndicator.icon = "";
      this.v1MeanIndicator.icon = "";
      this.v2MeanIndicator.icon = "";
      this.v3MeanIndicator.icon = "";
      this.v1MedianIndicator.icon = "";
      this.v2MedianIndicator.icon = "";
      this.v3MedianIndicator.icon = "";

      let result = true;
      if (this.v1ComboBox.currentItem == 0) {
         result = false;
      };
      if (this.v2ComboBox.currentItem == 0) {
         result = false;
      };
      if (this.threeViewsRadioButton.checked && (this.v3ComboBox.currentItem == 0)) {
         result = false;
      };
      if (this.v1ComboBox.currentItem == this.v2ComboBox.currentItem) {
         result = false;
      };
      if (this.threeViewsRadioButton.checked && ((this.v1ComboBox.currentItem == this.v3ComboBox.currentItem) || (this.v2ComboBox.currentItem == this.v3ComboBox.currentItem))) {
         result = false;
      };

      if (v1mono == 2) {
         result = false;
      };
      if (v2mono == 2) {
         result = false;
      };
      if (v3mono == 2) {
         result = false;
      };

      this.executeButton.enabled = result;

      if (result) {
         this.refCalculate();
      };
   };

   // two or three views
   this.twoViewsRadioButton.onCheck = () => {
      if (this.twoViewsRadioButton.checked) {
         this.v3ComboBox.enabled = false;
         this.userRefRadioButton.checked = true;
         this.meanRefRadioButton.enabled = false;
         this.medianRefRadioButton.enabled = false;
         this.minRefRadioButton.enabled = false;
         this.midRefRadioButton.enabled = false;
         this.maxRefRadioButton.enabled = false;
         this.firstRefRadioButton.enabled = true;
         this.secondRefRadioButton.enabled = true;
         this.thirdRefRadioButton.enabled = false;
         this.canExecute();
      }
   };
   this.threeViewsRadioButton.onCheck = () => {
      if (this.threeViewsRadioButton.checked) {
         this.v3ComboBox.enabled = true;
         this.meanRefRadioButton.enabled = true;
         this.medianRefRadioButton.enabled = true;
         if (this.userRefRadioButton.checked) {
            this.firstRefRadioButton.enabled = true;
            this.secondRefRadioButton.enabled = true;
            this.thirdRefRadioButton.enabled = true;
            this.minRefRadioButton.enabled = false;
            this.midRefRadioButton.enabled = false;
            this.maxRefRadioButton.enabled = false;
         } else {
            this.firstRefRadioButton.enabled = false;
            this.secondRefRadioButton.enabled = false;
            this.thirdRefRadioButton.enabled = false;
            this.minRefRadioButton.enabled = true;
            this.midRefRadioButton.enabled = true;
            this.maxRefRadioButton.enabled = true;
         };
         this.canExecute();
      }
   };

   // mode
   this.userRefRadioButton.onCheck = () => {
      if (this.userRefRadioButton.checked) {
         this.minRefRadioButton.enabled = false;
         this.midRefRadioButton.enabled = false;
         this.maxRefRadioButton.enabled = false;
         this.firstRefRadioButton.enabled = true;
         this.secondRefRadioButton.enabled = true;
         this.thirdRefRadioButton.enabled = !this.twoViewsRadioButton.checked;
         this.canExecute();
      }
   };
   this.meanRefRadioButton.onCheck = () => {
      if (this.meanRefRadioButton.checked) {
         this.minRefRadioButton.enabled = true;
         this.midRefRadioButton.enabled = true;
         this.maxRefRadioButton.enabled = true;
         this.firstRefRadioButton.enabled = false;
         this.secondRefRadioButton.enabled = false;
         this.thirdRefRadioButton.enabled = false;
         this.canExecute();
      }
   };
   this.medianRefRadioButton.onCheck = () => {
      if (this.medianRefRadioButton.checked) {
         this.minRefRadioButton.enabled = true;
         this.midRefRadioButton.enabled = true;
         this.maxRefRadioButton.enabled = true;
         this.firstRefRadioButton.enabled = false;
         this.secondRefRadioButton.enabled = false;
         this.thirdRefRadioButton.enabled = false;
         this.canExecute();
      }
   };

   this.minRefRadioButton.onCheck = () => {
      if (this.minRefRadioButton.checked) {
         this.canExecute();
      }
   };

   this.midRefRadioButton.onCheck = () => {
      if (this.midRefRadioButton.checked) {
         this.canExecute();
      }
   };

   this.maxRefRadioButton.onCheck = () => {
      if (this.maxRefRadioButton.checked) {
         this.canExecute();
      }
   };

   this.firstRefRadioButton.onCheck = () => {
      if (this.firstRefRadioButton.checked) {
         this.canExecute();
      }
   };

   this.secondRefRadioButton.onCheck = () => {
      if (this.secondRefRadioButton.checked) {
         this.canExecute();
      }
   };

   this.thirdRefRadioButton.onCheck = () => {
      if (this.thirdRefRadioButton.checked) {
         this.canExecute();
      }
   };

   // get mean or median on view selection
   // aux function
   this.getMeanMedian = function(aView) {
      let theView = ImageWindow.windowById(aView);

      let theMedian = theView.mainView.image.median();
      let theMean = theView.mainView.image.mean();

      return {theMean: theMean, theMedian: theMedian};
   };

   this.v1ComboBox.onItemSelected = () => {
      if (this.v1ComboBox.currentItem > 0) {
         let txt = this.v1ComboBox.itemText(this.v1ComboBox.currentItem);
         let v1Values = this.getMeanMedian(txt);
         this.v1mean = v1Values.theMean;
         this.v1median = v1Values.theMedian;
         this.meanv1Box.text = this.v1mean.toExponential(5);
         this.medianv1Box.text = this.v1median.toExponential(5);
         if (checkImageIsGreyscale(txt)) {
            this.v1mono = 1;
            this.v1MonoIndicator.icon = ":/toolbar/image-display-value.png";
         } else {
            this.v1mono = 2;
            this.v1MonoIndicator.icon = ":/toolbar/image-display-rgb.png";
         };
      } else {
         this.v1mono = 0;
         this.v1MonoIndicator.icon = "";
         this.meanv1Box.text = "-----";
         this.medianv1Box.text = "-----";
      };
      this.canExecute();
   }

   this.v2ComboBox.onItemSelected = () => {
      if (this.v2ComboBox.currentItem > 0) {
         let txt = this.v2ComboBox.itemText(this.v2ComboBox.currentItem);
         let v2Values = this.getMeanMedian(txt);
         this.v2mean = v2Values.theMean;
         this.v2median = v2Values.theMedian;
         this.meanv2Box.text = this.v2mean.toExponential(5);
         this.medianv2Box.text = this.v2median.toExponential(5);
         if (checkImageIsGreyscale(txt)) {
            this.v2mono = 1;
            this.v2MonoIndicator.icon = ":/toolbar/image-display-value.png";
         } else {
            this.v2mono = 2;
            this.v2MonoIndicator.icon = ":/toolbar/image-display-rgb.png";
         };
      } else {
         this.v2mono = 0;
         this.v2MonoIndicator.icon = "";
         this.meanv2Box.text = "-----";
         this.medianv2Box.text = "-----";
      };
      this.canExecute();
   }

   this.v3ComboBox.onItemSelected = () => {
      if (this.v3ComboBox.currentItem > 0) {
         let txt = this.v3ComboBox.itemText(this.v3ComboBox.currentItem);
         let v3Values = this.getMeanMedian(txt);
         this.v3mean = v3Values.theMean;
         this.v3median = v3Values.theMedian;
         this.meanv3Box.text = this.v3mean.toExponential(5);
         this.medianv3Box.text = this.v3median.toExponential(5);
         if (checkImageIsGreyscale(txt)) {
            this.v3mono = 1;
            this.v3MonoIndicator.icon = ":/toolbar/image-display-value.png";
         } else {
            this.v3mono = 2;
            this.v3MonoIndicator.icon = ":/toolbar/image-display-rgb.png";
         };
      } else {
         this.v3mono = 0;
         this.v3MonoIndicator.icon = "";
         this.meanv3Box.text = "-----";
         this.medianv3Box.text = "-----";
      };
      this.canExecute();
   }

   // Function to duplicate image
   this.duplicateImage = function(v) {
      let oldImg = ImageWindow.windowById(v);
      let newId = v + "_LFIT";
      if (ImageWindow.windowById(newId)) {
         newId = findUniqueImageID(newId);
      }

      var newImg = new ImageWindow(1, 1, 1, oldImg.mainView.image.bitsPerSample,
                                   oldImg.mainView.image.sampleType == SampleType_Real,
                                   false, newId);

      with (newImg.mainView) {
         beginProcess(UndoFlag_NoSwapFile );
         image.assign(oldImg.mainView.image);
         endProcess();
      };

      newImg.show();
      newImg.zoomToFit();

      return newImg.mainView.id;
   };

};

CGlFitDialog.prototype= new Dialog;

CGlFitDialog.prototype.executeScript = function() {
    // Close any previously created images to avoid conflicts
    // closeCreatedWindows();

    let proc1img = undefined;
    let proc2img = undefined;

    let p1 = undefined;
    let p2 = undefined;

    // create linear fit proccess
    var P = new LinearFit;

    if (this.refId == 1) {
       P.referenceViewId = this.v1ComboBox.itemText(this.v1ComboBox.currentItem);
       proc1img = this.v2ComboBox.itemText(this.v2ComboBox.currentItem);
       if (this.threeViewsRadioButton.checked) {
          proc2img = this.v3ComboBox.itemText(this.v3ComboBox.currentItem);
       };
    } else if (this.refId == 2) {
       P.referenceViewId = this.v2ComboBox.itemText(this.v2ComboBox.currentItem);
       proc1img = this.v1ComboBox.itemText(this.v1ComboBox.currentItem);
       if (this.threeViewsRadioButton.checked) {
          proc2img = this.v3ComboBox.itemText(this.v3ComboBox.currentItem);
       };
    } else {
       P.referenceViewId = this.v3ComboBox.itemText(this.v3ComboBox.currentItem);
       proc1img = this.v1ComboBox.itemText(this.v1ComboBox.currentItem);
       proc2img = this.v2ComboBox.itemText(this.v2ComboBox.currentItem);
    };

    P.rejectLow = this.rejectLowNumeric.value;
    P.rejectHigh = this.rejectHighNumeric.value;

    Console.writeln ("Reference: " + P.referenceViewId);
    Console.writeln ("Target 1: " + proc1img);

    if (this.newCheckBox.checked) {
       proc1img = this.duplicateImage(proc1img);
    };

    // process image
    let p1 = ImageWindow.windowById(proc1img);
    Console.writeln ("Result 1 in: " + p1);
    P.executeOn (p1.mainView);

    // process another image if option is 3 views
    if (this.threeViewsRadioButton.checked) {
       Console.writeln ("Target 2: " + proc2img);
       if (this.newCheckBox.checked) {
           proc2img = this.duplicateImage(proc2img);
       };
       let p2 = ImageWindow.windowById(proc2img);
       Console.writeln ("Result 2 in: " + p2);
       P.executeOn (p2.mainView);
    };

};

function main() {
Console.criticalln("CGlFit Script");
Console.warningln("CGlFit Script");
    let dialog = new CGlFitDialog();
    if (dialog.execute() !== Dialog.prototype.Accepted) {
        console.noteln("CGlFit Script Dialog Closed.");
    }
}

main();
