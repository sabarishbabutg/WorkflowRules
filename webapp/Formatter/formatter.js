jQuery.sap.declare("RulesEngine.Formatter.formatter");
RulesEngine.Formatter.formatter = {
	changeIndToBoolean: function(value) {
		return value === "X"; // "X" → true, "" → false
	},
	formatFtype: function(sValue) {
		if (sValue === "I") {
			return "Input";
		} else if (sValue === "R") {
			return "Output";
		}
		//	return sValue || ""; // fallback if null/other
	},
	fnShowValueHelp: function(sFnmId) {
		if (!sFnmId) {
			return false;
		}

		var oFilteredModel = sap.ui.getCore().getModel("JM_FILTEREDRULE");
		if (!oFilteredModel) {
			return false;
		}

		var aResults = oFilteredModel.getProperty("/results") || [];
		var oTargetField = aResults.find(function(item) {
			return item.FnmId === sFnmId;
		});

		return !!(oTargetField && oTargetField.SearchHelp);
	},
	formatValueHelpItem: function(Ddtext, DomvalueL, Value1, Value2) {
		var val1 = DomvalueL || Value1;
		var val2 = Ddtext || Value2;
		return val1 && val2 ? val1 + " - " + val2 : (val1 || val2);
	},
};