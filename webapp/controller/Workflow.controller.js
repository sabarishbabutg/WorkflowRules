sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"WorkflowRules/controller/ErrorHandler",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/m/MessageBox",
	"sap/ui/model/FilterOperator"
], function(Controller, ErrorHandler, JSONModel, Filter, MessageBox, FilterOperator) {
	"use strict";

	var busyDialog = new sap.m.BusyDialog();
	return Controller.extend("WorkflowRules.controller.Workflow", {

		// *--------------------------------------------------------------------------------------
		//				Initial Level Model setting and Username model service calls
		// *--------------------------------------------------------------------------------------

		onInit: function() {

			var vPathImage = jQuery.sap.getModulePath("WorkflowRules") + "/Image/";
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: vPathImage
			});
			this.getView().setModel(oImageModel, "JM_ImageModel");

			var oData = {
				tableDataGD: [{}]
			};
			var oGeneralDataModel = new sap.ui.model.json.JSONModel(oData);
			this.getView().setModel(oGeneralDataModel);

			var oViewVisibleModel = new sap.ui.model.json.JSONModel({
				isEditable: false
			});
			this.getView().setModel(oViewVisibleModel, "viewModel");

			var oViewEditableModel = new sap.ui.model.json.JSONModel({
				isComboEditable: false
			});
			this.getView().setModel(oViewEditableModel, "viewModel");

			var oTFModel = new sap.ui.model.json.JSONModel({
				List: [{
					DomvalueL: "Sequential",
					Ddtext: "Sequential"
				}, {
					DomvalueL: "Parallel",
					Ddtext: "Parallel"
				}],
				selectedValue: "Sequential"
			});
			this.getView().setModel(oTFModel, "JAppID");

			var oAreaModel = new sap.ui.model.json.JSONModel({
				List: [{
					DomvalueL: "Reviewer",
					Ddtext: "Reviewer"
				}, {
					DomvalueL: "Approver",
					Ddtext: "Approver"
				}],
				selectedValue: "Reviewer"
			});
			this.getView().setModel(oAreaModel, "JAreaModel");

			this._bAddEnabled = false;
			this._bAddEnabledLD = false;
			this.emailflag = false;
			this.change = false;
			this._bIsEditMode = false;
			this._sActiveTab = "Email";

			var oViewModel = new sap.ui.model.json.JSONModel({
				isEditable: false,
				isComboEditable: false,
				isActiveEditable: false,
				selectedLDIndex: -1
			});
			this.getView().setModel(oViewModel, "viewModel");

			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var that = this;
			var umodel = this.getOwnerComponent().getModel("JMConfig");
			umodel.read("/UsernameSet", {
				success: function(odata) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData({
						Uname: odata.results[0].Uname,
						Sysid: odata.results[0].Agent,
						id: odata.results[0].Sysid
					});
					that.getView().setModel(oJsonModel, "UserModel");
					var oPayload = {
						F4Type: "F",
						FieldId: "WID_APPID",
						Process: "W"
					};
					oPayload.NavSerchResult = [];
					oModel.create("/SearchHelpSet", oPayload, {
						success: function(oData) {
							var aResults = oData.NavSerchResult.results.filter(function(item) {
								return item.DomvalueL !== "ALL";
							});
							var oJson = new sap.ui.model.json.JSONModel({
								List: aResults
							});
							this.getView().setModel(oJson, "F4HelpModel");
						}.bind(this),
						error: function(oResponse) {
							busyDialog.close();
							var sMessage = ErrorHandler.parseODataError(oResponse);
							ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
						}.bind(this)
					});
				}.bind(this)
			});

			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("Workflow").attachPatternMatched(this.fnRouter, this);
		},

		// *--------------------------------------------------------------------------------------
		//				Each tym screen loads this will triggers
		// *--------------------------------------------------------------------------------------
		fnRouter: function() {
			this.fnclearSection();
		},

		// *--------------------------------------------------------------------------------------
		//			 Clear All Dynamic fields and the flags
		// *--------------------------------------------------------------------------------------
		fnclearSection: function() {
			this._resetFlags();
			this._resetButtonsAndFields();
			this._resetStyles();
			this._clearDynamicFields();
			this._resetModels();
			this._refreshTables();
			this._resetSelections();
		},

		_resetFlags: function() {
			this.change = true;
			this._bIsEditMode = false;
			this._bAddEnabled = false;
			this._bAddEnabledLD = false;
			this.dynamicFieldCopyFlag = false;
			this.agentFieldFlag = false;
			this.dynamicFieldFlag = false;
		},

		_resetButtonsAndFields: function() {
			this.byId("id_search").setEnabled(true);
			this.byId("id_ChngeSrch").setEnabled(false);
			this.byId("id_forAgent").setEnabled(false);
			this.byId("id_saveWf").setEnabled(false);
			this.byId("id_Copy").setEnabled(false);
			this.byId("id_change").setEnabled(false);
			this.byId("WID_APPID").setEditable(true);
			this.byId("WID_APPID").setValue("");

			this.getView().getModel("viewModel").setProperty("/isComboEditable", false);
			this.getView().getModel("viewModel").setProperty("/isEditable", false);
		},

		_resetStyles: function() {
			this.byId("id_LDTable").removeStyleClass("cl_maxfield");
			this.byId("ID_AGENT_INPUT").removeStyleClass("cl_chtabInput");

			[
				"AddImage", "DelImage",
				"AddImage1", "DelImage1",
				"AddImage2", "DelImage2"
			].forEach(function(sId) {
				this.byId(sId).addStyleClass("cl_AddDelete");
			}.bind(this));
		},

		_clearDynamicFields: function() {
			var oHBox = this.byId("id_WfParm");
			if (!oHBox) {
				return;
			}

			oHBox.getItems().forEach(function(oItem) {
				oItem.destroy();
			});
			oHBox.removeAllItems();
		},

		_resetModels: function() {
			var oView = this.getView();
			var oGDModel = oView.getModel("GDTableModel");
			if (oGDModel) {
				oGDModel.setProperty("/GDTableData", []);
				oGDModel.setProperty("/tableDataGD", []);
			}
			var oLDModel = oView.getModel("LDTableModel");
			if (oLDModel) {
				oLDModel.setProperty("/tableDataNew", []);
			}
			var oAAModel = oView.getModel("AATableModel");
			if (oAAModel) {
				oAAModel.setProperty("/tableDataAA", []);
			}
		},

		_refreshTables: function() {
			this._refreshTable("id_ResultTable", 10);
			this._refreshTable("id_LDTable");
			this._refreshTable("id_Agent");
		},

		_refreshTable: function(sTableId, iVisibleRows) {
			var oTable = this.byId(sTableId);
			if (oTable && oTable.getBinding("rows")) {
				oTable.getBinding("rows").refresh();
			}
			if (iVisibleRows && oTable) {
				oTable.setVisibleRowCount(iVisibleRows);
			}
		},

		_resetSelections: function() {
			this._iSelectedLDIndex = undefined;
			this._oSelectedLDRow = null;
			this._oSelectedFieldId = undefined;
		},

		// *--------------------------------------------------------------------------------------
		//				clear all and navigate back to home screen
		// *--------------------------------------------------------------------------------------
		fnNavBack: function() {
			this.fnclearSection();
			sap.ui.core.UIComponent.getRouterFor(this).navTo("HomePage");
		},

		// *--------------------------------------------------------------------------------------
		//				When application ID F4 Press it will triggers
		// *--------------------------------------------------------------------------------------
		fnF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			var f4type;
			if (["WID_APPID"].includes(id)) {
				f4type = "F";
			} else {
				f4type = "P";
			}
			var oPayload = {
				FieldId: id,
				Process: "D",
				F4Type: f4type
			};
			oPayload.NavSerchResult = [];
			this.bindTextF4model(oPayload, oEvent);
		},

		// Dynamic Created Input and table F4 Help
		fnGetValueHelp: function(Fieldid, oEvent) {
			var id = Fieldid;
			this.selectedField = id;
			this._oSelectedFieldId = oEvent.getSource();
			this.dynamicFieldFlag = true;
			var f4type;
			if (["WID_APPID"].includes(id)) {
				f4type = "F";
			} else {
				f4type = "P";
			}
			var oPayload = {
				FieldId: id,
				Process: "K",
				F4Type: f4type
			};
			oPayload.NavSerchResult = [];
			this.bindTextF4model(oPayload, oEvent);
		},

		// mass agent appid f4 press 
		fnGetMaasAppid: function(oEvent) {
			if (!this.MassAgentAppidfrag) {
				this.MassAgentAppidfrag = sap.ui.xmlfragment("WorkflowRules.fragment.MassAppid", this);
				this.getView().addDependent(this.MassAgentAppidfrag);
			}
			this.MassAgentAppidfrag.open();
		},

		// mass button agent F4 press
		fngetmassaddAgents: function(oEvent) {
			this._oSelectedFieldId = oEvent.getSource();
			var oPayload = {
				FieldId: "WID_AGENT",
				Process: "W",
				F4Type: "P"
			};
			oPayload.NavSerchResult = [];
			this.dynamicFieldFlag = true;
			this.agentFieldFlag = true;
			this.bindTextF4model(oPayload, oEvent);
		},

		// get Master for the mass agetnt 
		fnGetMasterMassAgent: function(oEvent) {
			this._oSelectedFieldId = oEvent.getSource();
			var oPayload = {
				FieldId: "WID_MASTER",
				Process: "W",
				F4Type: "F"
			};
			oPayload.NavSerchResult = [];
			this.dynamicFieldFlag = true;
			// this.agentFieldFlag = true;
			this.bindTextF4model(oPayload, oEvent);
		},

		// level table agent F4 click
		fngetAgents: function(oEvent) {
			this._oSelectedFieldId = oEvent.getSource();
			var oPayload = {
				FieldId: "WID_AGENT",
				Process: "W",
				F4Type: "P"
			};
			oPayload.NavSerchResult = [];
			this.agentFieldFlag = true;
			this.bindTextF4model(oPayload, oEvent);
		},

		// in copy fragment dynamic F4 press field
		fnCopyDynimcF4press: function(oEvent) {
			var oInput = oEvent.getSource();
			var sPath = oInput.getBindingInfo("value").parts[0].path;
			var sKey = sPath.split("/").pop();
			var iParmNumber = sKey.replace("WfParm", "");
			var oFieldConfig = this.getView().getModel("JScreenParm").getProperty("/List/0");
			var sFieldId = oFieldConfig["WfParm" + iParmNumber + "Id"];
			this._oSelectedFieldId = oInput;
			this.dynamicFieldCopyFlag = true;
			this.fnCustomizeBindF4Model(sFieldId, oEvent);
		},

		// *--------------------------------------------------------------------------------------
		//				live Change functionality check for validation of data
		// *--------------------------------------------------------------------------------------
		fn_validateF4Value: function(sFieldId, sInputValue, fnCallback) {
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var oPayload = {
				F4Type: "P",
				FieldId: sFieldId,
				Process: "K"
			};
			oPayload.NavSerchResult = [];
			if (sFieldId === "KID_PM") {
				if (sInputValue === "PM") {
					fnCallback(true);
				} else {
					fnCallback(false);
				}
			} else {
				oModel.create("/SearchHelpSet", oPayload, {
					success: function(oData) {
						var aF4Values = oData.NavSerchResult.results.map(function(oItem) {
							return oItem.Value1;
						});
						var bValid = aF4Values.some(function(val) {
							return val.toLowerCase() === sInputValue.trim().toLowerCase();
						});
						fnCallback(bValid);
					},
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
						fnCallback(false);
					}.bind(this)
				});
			}
		},

		// copy fragemnt input field live change actions
		onGDInputChange: function(oEvent) {
			var oView = this.getView();
			var oGDModel = oView.getModel("GDTableModel");
			var aFullData = oGDModel.getProperty("/GDTableData") || [];

			var oInput = oEvent.getSource();
			var oContext = oInput.getBindingContext("GDTableModel");
			if (!oContext) {
				return;
			}
			var sField = oInput.getBindingInfo("value").binding.getPath(); // e.g., WfParm1
			// Converting into uppercase
			var sCurrentValue = oInput.getValue();
			var sUpperValue = sCurrentValue.toUpperCase();
			if (sCurrentValue !== sUpperValue) {
				oInput.setValue(sUpperValue);
				oGDModel.setProperty(oContext.getPath() + "/" + sField, sUpperValue);
			}

			// Get corresponding FieldId from JScreenParm
			var iParmIndex = sField.replace("WfParm", ""); // e.g., "1", "2", etc.
			var oFieldConfig = this.getView().getModel("JScreenParm").getProperty("/List/0");
			var sFieldId = oFieldConfig["WfParm" + iParmIndex + "Id"];

			var that = this;
			// Call F4 service manually and validate
			this.fn_validateF4Value(sFieldId, oInput.getValue(), function(bValid) {
				if (!bValid) {
					ErrorHandler.showCustomSnackbar("Invalid value for field", "Error", that);
					oInput.setValue("");
					oGDModel.setProperty(oContext.getPath() + "/" + sField, "");
				}
			});

			var oEditedRow = oContext.getObject();

			if (oEditedRow.isNew && oEditedRow.WfParm1 && oEditedRow.WfParm2) {
				var bDuplicate = aFullData.some(function(oRow) {
					if (oRow === oEditedRow) return false;

					var bBasicMatch = oRow.WfParm1 === oEditedRow.WfParm1 &&
						oRow.WfParm2 === oEditedRow.WfParm2;

					var hasParm3 = !!oEditedRow.WfParm3;
					if (hasParm3) {
						return bBasicMatch && oRow.WfParm3 === oEditedRow.WfParm3;
					} else {
						return bBasicMatch;
					}
				});

				if (bDuplicate) {
					ErrorHandler.showCustomSnackbar("Duplicate row detected", "Error", this);
					oInput.setValue("");
					var sPath = oContext.getPath();
					var sField = oInput.getBindingInfo("value").binding.getPath();
					oGDModel.setProperty(sPath + "/" + sField, "");
				}
			}

			oGDModel.setProperty("/GDTableData", aFullData);
			oGDModel.refresh(true);
		},

		// minimum apporver column live change
		onMinApprLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var sValue = oInput.getValue();
			var iValue = parseInt(sValue, 10);
			var sPath;
			var oContext;
			if (!/^\d+$/.test(sValue) || parseInt(sValue, 10) === 0) {
				sPath = oContext.getPath();
				ErrorHandler.showCustomSnackbar("Please enter a valid Min role", "Warning", this);
				oInput.setValue("");
				oContext.getModel().setProperty(sPath + "/MinAppr", "");
				return;
			}

			oContext = oInput.getBindingContext("LDTableModel");
			if (!oContext || isNaN(iValue)) {
				return;
			}

			sPath = oContext.getPath();

			oContext.getModel().setProperty(sPath + "/MinAppr", sValue);

			this._checkMinApprCompletion();
		},

		// when end data column change
		onEndDateChange: function(oEvent) {
			var oRow;
			var oDatePicker = oEvent.getSource();
			var sPath = oDatePicker.getBindingContext("AATableModel").getPath();
			var oModel = this.getView().getModel("AATableModel");

			var oDate = oEvent.getParameter("dateValue"); // Date object
			var sValue = oEvent.getParameter("value"); // String in dd.MM.yyyy

			// If oDate is not valid (e.g., user typed invalid date)
			if (!oDate && sValue) {
				var aParts = sValue.split(".");
				if (aParts.length === 3) {
					var iDay = parseInt(aParts[0], 10);
					var iMonth = parseInt(aParts[1], 10) - 1;
					var iYear = parseInt(aParts[2], 10);
					oDate = new Date(iYear, iMonth, iDay);

					if (isNaN(oDate.getTime())) {
						oDate = null;
					}
				}
			}

			if (!oDate) {
				ErrorHandler.showCustomSnackbar("Invalid date format. Use dd.MM.yyyy.", "Error", this);
				oDatePicker.setValue(""); // clears display
				oRow = oModel.getProperty(sPath);
				oRow.EndDate = "";
				oModel.setProperty(sPath, oRow);
				return;
			}

			// Check if date is in the past
			var oToday = new Date();
			oToday.setHours(0, 0, 0, 0);
			if (oDate < oToday) {
				ErrorHandler.showCustomSnackbar("End Date cannot be lesser than today's date.", "Error", this);
				oDatePicker.setValue(""); // clears display
				oRow = oModel.getProperty(sPath);
				oRow.EndDate = "";
				oModel.setProperty(sPath, oRow);
				return;
			}

			// Format to dd.MM.yyyy and set in model
			var sFormattedDate = String(oDate.getDate()).padStart(2, '0') + "." +
				String(oDate.getMonth() + 1).padStart(2, '0') + "." +
				oDate.getFullYear();

			oRow = oModel.getProperty(sPath);
			oRow.EndDate = sFormattedDate;
			oModel.setProperty(sPath, oRow);

			// Set formatted date in the input field manually (important)
			oDatePicker.setValue(sFormattedDate);

			this._checkMinApprCompletion();
		},

		_validateDuplicateWFParams: function() {
			var aData = this.getView().getModel("GDTableModel").getProperty("/GDTableData") || [];
			var mSeen = Object.create(null);
			for (var i = 0; i < aData.length; i++) {
				var oRow = aData[i];
				// Normalize values (important!)
				var sKey = [
					oRow.WfParm1 || "",
					oRow.WfParm2 || "",
					oRow.WfParm3 || "",
					oRow.WfParm4 || ""
				].map(function(v) {
					return v.toString().trim();
				}).join("|");
				if (mSeen[sKey]) {
					return {
						hasDuplicate: true,
						duplicateIndex: i
					};
				}
				mSeen[sKey] = true;
			}
			return {
				hasDuplicate: false
			};
		},

		// *--------------------------------------------------------------------------------------
		//				F4 fragment open Utilities
		// *--------------------------------------------------------------------------------------
		fnF4fragopen: function(oEvent, vTitle) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "WorkflowRules.fragment.F4Help", this);
				this.getView().addDependent(this.f4HelpFrag);
			}
			this.f4HelpFrag.setTitle(vTitle);
			return this.f4HelpFrag;
		},

		fnf4HelpCancel: function(oEvent) {
			this.fnF4fragopen().close();
			this.f4HelpFrag.destroy();
			this.f4HelpFrag = null;
		},

		fnAfterCloseFragment: function(oEvent) {
			this.fnF4fragopen().close();
			this.f4HelpFrag.destroy();
			this.f4HelpFrag = null;
		},

		fnValueSearch: function(oEvent) {
			var oInput = oEvent.getSource();
			var sValue = oInput.getValue();
			oInput.setValue(sValue.toUpperCase());
			var sQuery = oEvent.getSource().getValue().toLowerCase();
			// Get table and binding
			var oTable = this.byId("idMaterialTable");
			var oBinding = oTable.getBinding("items");
			if (!oBinding) {
				return;
			}
			var aFilters = [];
			// Filter on all possible columns
			if (sQuery) {
				aFilters.push(new sap.ui.model.Filter({
					filters: [
						new sap.ui.model.Filter("col1", sap.ui.model.FilterOperator.StartsWith, sQuery),
						new sap.ui.model.Filter("col2", sap.ui.model.FilterOperator.StartsWith, sQuery),
						new sap.ui.model.Filter("col3", sap.ui.model.FilterOperator.StartsWith, sQuery),
						new sap.ui.model.Filter("col4", sap.ui.model.FilterOperator.StartsWith, sQuery)
					],
					and: false
				}));
			}
			oBinding.filter(aFilters, "Application");
		},

		// *--------------------------------------------------------------------------------------
		//				common fnctioon logic F4 item selected it will tiggers
		// *--------------------------------------------------------------------------------------
		fnF4Itempress: function(oEvent) {
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_F4Model");
			if (!oContext) {
				return;
			}
			var item = oContext.getProperty("col1"); // Value (e.g., 'IN')
			var item1 = oContext.getProperty("col2"); // Description (e.g., 'India')

			if (this.selectedField === "WID_APPID" && !this.dynamicFieldFlag) { // when appid f4 press
				this.getView().byId(this.selectedField).setValue(item + " - " + item1);
				this.fnGetParmeterDetails(item);
			} else if (this.dynamicFieldFlag) {
				this._oSelectedFieldId.setValue(item);
				if (this._oSelectedFieldId) {
					var oParent = this._oSelectedFieldId && this._oSelectedFieldId.getParent();
					if (oParent) {
						var sId = oParent.getId();
						// Check for "--"
						if (sId.indexOf("--") !== -1) {
							var aCompSplit = sId.split("--");
							var sAfterComp = aCompSplit[1];
							// Check that part contains "-"
							if (sAfterComp && sAfterComp.indexOf("-") !== -1) {
								var sViewId = sAfterComp.split("-")[0];
								// proceed with your existing condition
								if (sViewId === "id_ResultTable") {
									var oModel = this.getView().getModel("GDTableModel");
									var aTableData = oModel.getProperty("/GDTableData") || [];
									var aSeenValues = {};
									for (var i = 0; i < aTableData.length; i++) {
										var value1 = aTableData[i].WfParm1 || "";
										var value2 = aTableData[i].WfParm2 || "";
										var value3 = aTableData[i].WfParm3 || "";
										var value4 = aTableData[i].WfParm4 || "";
										var combo = value1 + "|" + value2 + "|" + value3 + "|" + value4;
										// Skip empty row
										if (combo === "|||") {
											continue;
										}
										// Duplicate found
										if (aSeenValues[combo]) {
											this._oSelectedFieldId.setValue("");
											ErrorHandler.showCustomSnackbar("Workflow is already maintained", "Error", this);
											return;
										}
										aSeenValues[combo] = true;
									}
								}
							}
						}
					}
				}
				this.dynamicFieldFlag = false;
			} else if (this.agentFieldFlag) { // when agent click it will triggers
				var oInput = this._oSelectedFieldId;
				if (!oInput) {
					return;
				}
				var oModel1 = this.getView().getModel("AATableModel");
				var oAAContext = oInput.getBindingContext("AATableModel");
				var vPath = oAAContext.getPath();
				oModel1.setProperty(vPath + "/Name", item1);
				oModel1.setProperty(vPath + "/Agent", item);
				oModel1.refresh(true);
				this.agentFieldFlag = false;
				this._checkMinApprCompletion();
			} else if (this.dynamicFieldCopyFlag) {
				this._oSelectedFieldId.setValue(item);
				this.fnCopyFragInputF4Itempress(item);
				this.dynamicFieldCopyFlag = false;
			} else {
				this.getView().byId(this.selectedField).setValue(item);
				this.getView().byId(this.selectedField).setValueState("None");
			}
			var desId = this.getView().byId(this.selectedField + "_DES");
			if (desId) {
				desId.setValue(item1);
			}
			this.fnAfterCloseFragment();
			this.selectedField = null;
		},

		// *--------------------------------------------------------------------------------------
		//				Copy Fragement the Input F4 item press this will trigger
		// *--------------------------------------------------------------------------------------
		fnCopyFragInputF4Itempress: function(item) {
			var sValue = item;
			// Source input (direct or stored reference)
			var oInput = this._oSelectedFieldId;
			if (!oInput) return;
			// Resolve binding
			var oBinding = oInput.getBinding("value");
			// === CASE 1: Copy Dialog (copyModel) ===
			if (oBinding && oBinding.getModel() === this.getView().getModel("copyModel")) {
				var oCopyModel = this.getView().getModel("copyModel");
				var sPath = oBinding.getPath(); // e.g. "/created/WfParm1"
				var sKey = sPath.split("/").pop(); // e.g. "WfParm1"
				var oCreated = oCopyModel.getProperty("/created") || {};
				var tempRow = Object.assign({}, oCreated);
				tempRow[sKey] = sValue;
				var oGDModel = this.getView().getModel("GDTableModel");
				var aData = oGDModel.getProperty("/GDTableData") || [];
				var isDuplicate = aData.some(function(row) {
					return (
						row.WfParm1 === (tempRow.WfParm1 || "") &&
						row.WfParm2 === (tempRow.WfParm2 || "") &&
						row.WfParm3 === (tempRow.WfParm3 || "") &&
						row.WfParm4 === (tempRow.WfParm4 || "")
					);
				});
				if (isDuplicate) {
					ErrorHandler.showCustomSnackbar("Duplicate entry already exists. Please select another one.", "Error", this);
					this._oSelectedFieldId.setValue("");
					this._oSelectedFieldId = null;
					return;
				}
				oCopyModel.setProperty("/created/" + sKey, sValue);
				oInput.setValue(sValue);
				oInput.fireChange({
					value: sValue
				});
			}
			// === CASE 2: Mass Copy (MassInputModel) ===
			else if (oInput.data("parmKey")) {
				var sParmKey = oInput.data("parmKey");
				var oMassModel = this.getView().getModel("MassInputModel");
				var sOldValue = oMassModel.getProperty("/" + sParmKey) || "";
				// Only check old vs. new here (no duplicate check!)
				if (sOldValue === sValue) {
					ErrorHandler.showCustomSnackbar("Same as existing value. Please select a different one.", "Error", this);
					oInput.setValue(""); // clear input
				} else {
					// oMassModel.setProperty("/" + sParmKey, sValue);
					oMassModel.setProperty("/New" + sParmKey, sValue);
					oInput.setValue(sValue);
					oInput.fireChange({
						value: sValue
					});
				}
			}
			// === CASE 3: Other inputs ===
			else {
				oInput.setValue(sValue);
				oInput.fireChange({
					value: sValue
				});
			}
			this._oSelectedFieldId = null; // cleanup
		},

		onOpenCopyDialog: function() {
			var oTable = this.byId("id_ResultTable");
			var aSelectedIndices = oTable.getSelectedIndices();
			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar("Please select a row to copy.", "Error", this);

				return;
			}

			var oSelectedData = oTable.getContextByIndex(aSelectedIndices[0]).getObject();
			var oSelected = {},
				oCreated = {};
			Object.keys(oSelectedData).forEach(function(key) {
				if (key.startsWith("WfParm")) {
					oSelected[key] = oSelectedData[key] || "";
					oCreated[key] = "";
				}
			});

			var oCopyModel = new sap.ui.model.json.JSONModel({
				selected: oSelected,
				created: oCreated
			});
			this.getView().setModel(oCopyModel, "copyModel");

			if (!this.pCopyDialog) {
				this.pCopyDialog = sap.ui.xmlfragment("id_copyrowfrag", "WorkflowRules.fragment.CopyRow", this);
				this.getView().addDependent(this.pCopyDialog);
			}

			var oVBox = sap.ui.core.Fragment.byId("id_copyrowfrag", "idCopyContent");
			oVBox.removeAllItems();

			var oJScreenParm = this.getView().getModel("JScreenParm").getProperty("/List/0");
			var oJMConfigModel = this.getOwnerComponent().getModel("JMConfig");

			// Collect parm field IDs for mapping
			var aFieldIds = [];
			Object.keys(oCreated).forEach(function(key) {
				if (oJScreenParm[key + "Id"]) {
					aFieldIds.push({
						id: oJScreenParm[key + "Id"],
						key: key,
						label: oJScreenParm[key + "Name"]
					});
				}
			});

			// -------- Selected Row ----------
			var oHBoxSelected = new sap.m.HBox({
				alignItems: "Center",
				justifyContent: "Start"
			}).addStyleClass("sapUiSmallMarginBottom sapUiSmallMarginEnd");

			oHBoxSelected.addItem(new sap.m.Text({
				text: "Selected Value :-",
				width: "8rem"
			}).addStyleClass("sapUiTinyMarginBeginEnd sapUiSmallMarginTopBottom cl_inputLabel"));

			Object.keys(oSelected).forEach(function(key) {
				var sLabel = oJScreenParm[key + "Name"];
				if (!sLabel) return;

				var oParmVBox = new sap.m.VBox();
				oParmVBox.addItem(new sap.m.Label({
					text: sLabel
				}).addStyleClass("sapUiTinyMarginBegin cl_inputLabel"));
				oParmVBox.addItem(new sap.m.Input({
					value: "{copyModel>/selected/" + key + "}",
					editable: false,
					width: "8rem"
				}).addStyleClass("sapUiTinyMarginBegin cl_inputField"));
				oHBoxSelected.addItem(oParmVBox);
			});
			oVBox.addItem(oHBoxSelected);

			// -------- New Row (fetch UI config dynamically) ----------
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var aFilter = [new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)];

			oJMConfigModel.read("/Wf_parm_uiSet", {
				filters: aFilter,
				success: function(oData) {
					var aUIConfigs = oData.results;

					var oHBoxCreated = new sap.m.HBox({
						alignItems: "Center",
						justifyContent: "Start",
					}).addStyleClass("sapUiSmallMarginEnd ");

					oHBoxCreated.addItem(new sap.m.Text({
						text: "New Value :-",
						width: "8rem"
					}).addStyleClass("sapUiTinyMarginBeginEnd sapUiSmallMarginTopBottom cl_inputLabel"));

					aFieldIds.forEach(function(field) {
						var oUIConf = aUIConfigs.find(function(cfg) {
							return cfg.FieldId === field.id;
						}) || {};

						var iMaxLength = oUIConf.MaxLength ? parseInt(oUIConf.MaxLength, 10) : 20;
						var sInputType = sap.m.InputType.Text;
						var sAllowedPattern = null;
						if (oUIConf.Type === "N") {
							sInputType = sap.m.InputType.Number;
							sAllowedPattern = /[^0-9]/g;
						} else if (oUIConf.Type === "A") {
							sInputType = sap.m.InputType.Text;
							sAllowedPattern = /[^a-zA-Z0-9]/g;
						}

						var oParmVBox = new sap.m.VBox();
						oParmVBox.addItem(new sap.m.Label({
							text: field.label
						}).addStyleClass("sapUiTinyMarginBegin cl_inputLabel"));

						var oInput = new sap.m.Input({
							value: "{copyModel>/created/" + field.key + "}",
							width: "8rem",
							maxLength: iMaxLength,
							type: sInputType,
							liveChange: function(oEvent) {
								var oSrc = oEvent.getSource();
								var val = oEvent.getParameter("value");

								if (sAllowedPattern) val = val.replace(sAllowedPattern, "");
								if (sInputType === sap.m.InputType.Number && val.length > iMaxLength) {
									val = val.substring(0, iMaxLength);
								}
								val = val.toUpperCase();
								oSrc.setValue(val);

								if (val.length === iMaxLength) {
									var that = this;
									this.fn_validateF4Value(field.id, val, function(bValid) {
										if (!bValid) {
											ErrorHandler.showCustomSnackbar("Invalid value for field.", "Error", that);
											oSrc.setValue("");
											oCopyModel.setProperty("/created/" + field.key, "");
										}
									}.bind(this));
								}
							}.bind(this),
							change: this.onGDInputChange.bind(this),
							showValueHelp: true,
							valueHelpOnly: false,
							valueHelpRequest: function(oEvent) {
								this.fnCopyDynimcF4press(oEvent);
							}.bind(this)
						}).addStyleClass("sapUiTinyMarginBegin cl_inputField");

						oParmVBox.addItem(oInput);
						oHBoxCreated.addItem(oParmVBox);
					}, this);

					oVBox.addItem(oHBoxCreated);
					this.pCopyDialog.open();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		onPressCopyConfirm: function(oEvent) {
			var vAppid = this.getView().byId("WID_APPID").getValue().split("-")[0].trim();
			var vCopyModel = this.getView().getModel("copyModel");
			var vGeneralTable = this.getView().byId("id_ResultTable");
			var vGeneralData = vGeneralTable.getModel("GDTableModel").getProperty("/GDTableData");

			var vSelected = vCopyModel.getProperty("/selected");
			var vCreated = vCopyModel.getProperty("/created");
			var aFields = ["WfParm1", "WfParm2", "WfParm3", "WfParm4"];
			var bMissing = aFields.some(function(field) {
				return vSelected[field] && vSelected[field].trim() !== "" && (!vCreated[field] || vCreated[field].trim() === "");
			});

			if (bMissing) {
				ErrorHandler.showCustomSnackbar("Created combination must have values for all parameters that are filled in Selected.", "Error",
					this);
				return;
			}
			var bExists = vGeneralData.some(function(item) {
				return item.WfParm1 === vCreated.WfParm1 &&
					item.WfParm2 === vCreated.WfParm2 &&
					item.WfParm3 === vCreated.WfParm3 &&
					item.WfParm4 === vCreated.WfParm4;
			});

			if (bExists) {
				ErrorHandler.showCustomSnackbar("Created combination already exists in the General Table.", "Error", this);
				return;
			}
			// var vSelectedIndex = vGeneralTable.getSelectedIndex();
			// var vSelectedRow = vGeneralTable.getContextByIndex(vSelectedIndex).getObject();
			// var vLevelCopy = JSON.parse(JSON.stringify(
			// 	(vSelectedRow.Navleveldef && vSelectedRow.Navleveldef.results)));
			// var vAgentCopy = JSON.parse(JSON.stringify(
			// 	(vSelectedRow.Navagentassign && vSelectedRow.Navagentassign.results)));
			var vToday = new Date();
			vToday.setHours(0, 0, 0, 0);
			// note: need to add agent Verification logic here
			var vPayload = {
				AppId: vAppid,
				Flag: "C"
			};
			Object.keys(vCreated).forEach(function(key) {
				vPayload[key + "From"] = vSelected[key] || "";
				vPayload[key + "To"] = vCreated[key] || "";
			});
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var that = this;

			oModel.create("/WFCopySet", vPayload, {
				success: function(oData) {
					ErrorHandler.showCustomSnackbar("Workflow copied successfully.", "success", that);
					that.onPressCopyCancel();
					that.fnSaveGdBehaviour();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		onPressCopyCancel: function() {
			if (this.pCopyDialog) {
				this.pCopyDialog.close();
				this.pCopyDialog.destroy();
				this.pCopyDialog = null;
			}
		},

		// *--------------------------------------------------------------------------------------
		//			Level table after input give check the Minimum number of approver
		// *--------------------------------------------------------------------------------------
		_checkMinApprCompletion: function() {
			var oView = this.getView();
			var oLDTable = oView.byId("id_LDTable");
			// var oLDModel = oView.getModel("LDTableModel");
			var oModel = oView.getModel("AATableModel");

			// var aLDRows = oLDModel.getProperty("/tableDataNew") || [];
			var aAARows = oModel.getProperty("/tableDataAA") || [];

			var iLDIndex = oLDTable.getSelectedIndex();
			if (iLDIndex < 0) {
				return;
			}

			var oSelectedLDRow = oLDTable.getContextByIndex(iLDIndex).getObject();
			var oAddImage = oView.byId("AddImage1");
			if (!oSelectedLDRow) {
				return;
			}
			if (oSelectedLDRow.Lvl === "L0") {
				this._bAddEnabledLD = true;
				if (oAddImage) {
					oAddImage.removeStyleClass("cl_AddDelete");
				}
				return;
			}
			var sLvl = oSelectedLDRow.Lvl;
			var sType = oSelectedLDRow.Type;

			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var bIsMassMaterial = sAppId.startsWith("MM") || sAppId.startsWith("RC") || sAppId.startsWith("BC") || sAppId.startsWith("PVMC") ||
				sAppId.startsWith("BX") || sAppId.startsWith("RX") || sAppId.startsWith("PHC") || sAppId.startsWith("PHX") || sAppId.startsWith(
					"PM") ||
				sAppId.startsWith("MG");
			if (sType === "Parallel") {
				var iMinAppr = parseInt(oSelectedLDRow.MinAppr || "0", 10);

				var aMatchingRows = aAARows.filter(function(row) {
					return row.LvlFromLD === sLvl;
				});

				// Count fully filled rows
				var iCompleteCount = aMatchingRows.filter(function(row) {
					return row.Agent && row.Name &&
						row.Agent.trim() !== "" && row.Name.trim() !== "" &&
						row.EndDate &&
						(bIsMassMaterial || (row.Variant && row.Variant.trim() !== ""));
				}).length;

				// Check if any row is incomplete
				var bHasIncomplete = aMatchingRows.some(function(row) {
					return !row.Agent || row.Agent.trim() === "" ||
						!row.Name || row.Name.trim() === "" ||
						!row.EndDate ||
						(!bIsMassMaterial && (!row.Variant || row.Variant.trim() === ""));

				});
				var bAllActive = aMatchingRows.every(function(row) {
					return row.Active === true;
				});

				if (!bAllActive) {
					this._bAddEnabledLD = false;
					if (oAddImage) {
						oAddImage.addStyleClass("cl_AddDelete");
					}
					return;
				}

				if (iCompleteCount >= iMinAppr && !bHasIncomplete) {
					this._bAddEnabledLD = true;
					if (oAddImage) {
						oAddImage.removeStyleClass("cl_AddDelete");
					}
				} else {
					this._bAddEnabledLD = false;
					if (oAddImage) {
						oAddImage.addStyleClass("cl_AddDelete");
					}
				}
			} else if (sType === "Sequential") {
				var oLastRow = aAARows[aAARows.length - 1];
				var bRowValid = oLastRow &&
					oLastRow.LvlFromLD === sLvl &&
					oLastRow.Agent && oLastRow.Agent.trim() !== "" &&
					oLastRow.EndDate &&
					(bIsMassMaterial || (oLastRow.Variant && oLastRow.Variant.trim() !== ""));

				if (bRowValid) {
					this._bAddEnabledLD = true;
					if (oAddImage) {
						oAddImage.removeStyleClass("cl_AddDelete");
					}
				} else {
					this._bAddEnabledLD = false;
					if (oAddImage) {
						oAddImage.addStyleClass("cl_AddDelete");
					}
				}
			}
		},

		// *--------------------------------------------------------------------------------------
		//			Acitive button check box press it will triggers
		// *--------------------------------------------------------------------------------------
		onActiveSelect: function(oEvent) {
			this._checkMinApprCompletion();
		},

		// *--------------------------------------------------------------------------------------
		//				Once Application Id Selected it will triggers
		// *--------------------------------------------------------------------------------------
		fnGetParmeterDetails: function(vselectedappid) {
			var that = this;
			var vAppId = vselectedappid.split("-")[0].trim();
			var vModel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			vModel.read("/WFParmSet", {
				filters: [new Filter("AppId", sap.ui.model.FilterOperator.EQ, vAppId)],
				success: function(oData) {
					var oJsonList = new sap.ui.model.json.JSONModel({
						List: oData.results
					});
					that.getView().setModel(oJsonList, "JScreenParm");
					that.fnBuildWorkflowInputs(vAppId);
					that.fnbuildDynamicColumns();
					busyDialog.close();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		fnBuildWorkflowInputs: function(vAppId) {
			var vwfcontianer = this.getView().byId("id_WfParm");
			var vScreenParams = this.getView().getModel("JScreenParm");
			var vParms = vScreenParams.getProperty("/List");
			var vModel = this.getOwnerComponent().getModel("JMConfig");
			var aItems = vwfcontianer.getItems().slice(); // clone array
			aItems.forEach(function(oItem) {
				vwfcontianer.removeItem(oItem);
				oItem.destroy();
			});
			vwfcontianer.rerender();
			var aFieldIds = [];
			var oParmRow = vParms[0];
			for (var i = 1; i <= 4; i++) {
				if (oParmRow["WfParm" + i + "Id"]) {
					aFieldIds.push({
						id: oParmRow["WfParm" + i + "Id"],
						label: oParmRow["WfParm" + i + "Name"]
					});
				}
			}
			var vFilter = [
				new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, vAppId)
			];
			busyDialog.open();
			vModel.read("/Wf_parm_uiSet", {
				filters: vFilter,
				success: function(oData) {
					var aUIConfigs = oData.results;

					aFieldIds.forEach(function(oField) {
						var oUIConf = null;
						for (var j = 0; j < aUIConfigs.length; j++) {
							if (aUIConfigs[j].FieldId === oField.id) {
								oUIConf = aUIConfigs[j];
								break;
							}
						}
						var iMaxLength = 20;
						if (oUIConf && oUIConf.MaxLength) {
							iMaxLength = parseInt(oUIConf.MaxLength, 10);
						}
						var sInputType = sap.m.InputType.Text; // default
						var sAllowedPattern = null;
						if (oUIConf && oUIConf.Type === "N") {
							sInputType = "N";
							sAllowedPattern = /[^0-9]/g; // remove everything except numbers
						} else if (oUIConf && oUIConf.Type === "A") {
							sInputType = "A";
							sAllowedPattern = /[^a-zA-Z0-9]/g; // remove everything except letters/numbers
						}
						var oOldInput = sap.ui.getCore().byId(oField.id);
						if (oOldInput) {
							oOldInput.destroy();
						}
						// Build VBox
						var oVBox = new sap.m.VBox({
							width: "10rem",
							visible: true
						}).addStyleClass(" sapUiSmallMarginEnd cl_dyn_wfparm"); // Mark as dynamic

						// Label
						var oLabel = new sap.m.Label({
							text: oField.label,
							labelFor: oField.id
						}).addStyleClass("cl_inputLabel");
						oVBox.addItem(oLabel);
						var oInput = new sap.m.Input({
							id: this.createId(oField.id),
							maxLength: iMaxLength,
							type: (sInputType === "N") ? sap.m.InputType.Number : sap.m.InputType.Text,
							showValueHelp: true,
							valueHelpOnly: false,
							valueHelpRequest: function(oEvent) {
								this.fnGetValueHelp(oField.id, oEvent);
							}.bind(this),
							liveChange: function(oEvent) {
								var oSrc = oEvent.getSource();
								var val = oEvent.getParameter("value");

								if (sAllowedPattern) {
									val = val.replace(sAllowedPattern, "");
								}

								if (sInputType === "N" && val.length > iMaxLength) {
									val = val.substring(0, iMaxLength);
								}
								val = val.toUpperCase();
								oSrc.setValue(val);
								if (val.length === iMaxLength) {
									this.fn_validateF4Value(oField.id, val, function(bValid, sLabel) {
										if (!bValid) {
											ErrorHandler.showCustomSnackbar("Please enter valid value.", "Error", this);
											oSrc.setValue("");
										}
									});
								}
							}.bind(this)
						}).addStyleClass("cl_inputField sapUiTinyMarginEnd");
						oVBox.addItem(oInput);
						// Add VBox to HBox
						vwfcontianer.addItem(oVBox);
					}, this);
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}
			});
		},

		fnbuildDynamicColumns: function() {
			var oTable = this.byId("id_ResultTable");
			var aColumns = oTable.getColumns();
			aColumns.forEach(function(oCol) {
				oTable.removeColumn(oCol);
			});

			var vModel = this.getOwnerComponent().getModel("JMConfig");
			var vJScreenParmModel = this.getView().getModel("JScreenParm");
			var aParms = vJScreenParmModel.getProperty("/List");

			if (!aParms.length) return;

			// Collect parm field IDs for mapping
			var aFieldIds = [];
			for (var i = 1; i <= 4; i++) {
				if (aParms[0]["WfParm" + i + "Id"]) {
					aFieldIds.push({
						id: aParms[0]["WfParm" + i + "Id"],
						nameProp: "WfParm" + i + "Name",
						valueProp: "WfParm" + i
					});
				}
			}

			// Read UI config for these fields
			var vAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var aFilter = [new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, vAppId)];

			vModel.read("/Wf_parm_uiSet", {
				filters: aFilter,
				success: function(oData) {
					var aUIConfigs = oData.results;
					var oWFParmModel = this.getView().getModel("jm_wfparm");
					if (!oWFParmModel) {
						oWFParmModel = new sap.ui.model.json.JSONModel();
						this.getView().setModel(oWFParmModel, "jm_wfparm");
					}
					oWFParmModel.setProperty("/GDFieldValueProps", aFieldIds.map(function(f) {
						return f.valueProp;
					}));
					aFieldIds.forEach(function(field) {
						var sNamePath = "JScreenParm>/List/0/" + field.nameProp;
						var sValuePath = "GDTableModel>" + field.valueProp;

						// Find UI config for this field
						var oUIConf = aUIConfigs.find(function(cfg) {
							return cfg.FieldId === field.id;
						}) || {};

						// Determine settings
						var iMaxLength = oUIConf.MaxLength ? parseInt(oUIConf.MaxLength, 10) : 20;
						var sInputType = sap.m.InputType.Text;
						var sAllowedPattern = null;

						if (oUIConf.Type === "N") {
							sInputType = "N";
							sAllowedPattern = /[^0-9]/g;
						} else if (oUIConf.Type === "A") {
							sInputType = "C";
							sAllowedPattern = /[^a-zA-Z0-9]/g;
						}

						// Header
						var oTextHeader = new sap.m.Text({
							text: {
								path: sNamePath
							},
							tooltip: {
								path: sNamePath
							},
							wrapping: false
						}).addStyleClass("");

						// Single Input (editable only when new row)
						var oInput = new sap.m.Input({
							value: {
								path: sValuePath
							},
							editable: {
								path: "GDTableModel>isNew",
								formatter: function(bIsNew) {
									return bIsNew === true;
								}
							},
							maxLength: iMaxLength,
							type: (sInputType === "N") ? sap.m.InputType.Number : sap.m.InputType.Text,
							valueHelpOnly: false,
							showValueHelp: true,
							liveChange: function(oEvent) {
								var oSrc = oEvent.getSource();
								var val = oEvent.getParameter("value");
								if (sAllowedPattern) {
									val = val.replace(sAllowedPattern, "");
								}
								if (sInputType === "N" && val.length > iMaxLength) {
									val = val.substring(0, iMaxLength);
								}
								val = val.toUpperCase();
								oSrc.setValue(val);
								if (val.length === iMaxLength) {
									var that = this;
									this.fn_validateF4Value(field.id, val, function(bValid, sLabel) {
										if (!bValid) {
											ErrorHandler.showCustomSnackbar("Invalid value entered for " + sLabel + ".", "Error", that);
											oSrc.setValue("");
										}
										if (bValid) {
											var oResult = that._validateDuplicateWFParams();
											if (oResult.hasDuplicate) {
												ErrorHandler.showCustomSnackbar(
													"Duplicate combination of WF Parameters is not allowed",
													"Error", that
												);
												oSrc.setValue("");
											}
										}
									});
								}
							}.bind(this),
							valueHelpRequest: function(oEvent) {
								this.fnGetValueHelp(field.id, oEvent);
							}.bind(this)
						}).addStyleClass("cl_opr_tableInput");

						// Add column with single input
						var oColumn = new sap.ui.table.Column({
							label: oTextHeader,
							template: oInput,
							tooltip: {
								path: sNamePath
							},
							visible: {
								path: sNamePath,
								formatter: function(v) {
									return !!v;
								}
							}
						});
						oTable.addColumn(oColumn);
					}.bind(this));

				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		// *--------------------------------------------------------------------------------------
		//				When Search button press this triggers
		// *--------------------------------------------------------------------------------------

		onFilterTableDataGD: function() {
			var oView = this.getView();
			var oParmRow;
			var sFieldId;
			var oInput;
			var oTable = this.byId("id_ResultTable");
			var oLDModel = oView.getModel("LDTableModel");
			var oAAModel = oView.getModel("AATableModel");
			this.getView().getModel("viewModel").setProperty("/isEditable", false);
			// Get App ID from input
			var oAppInput = this.byId("WID_APPID");
			var sFullValue = oAppInput ? oAppInput.getValue().trim() : "";
			var sAppId = sFullValue.split("-")[0].trim();
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			if (!sAppId) {
				ErrorHandler.showCustomSnackbar("Please enter Application ID", "Information", this);
				return;
			}
			var aFilter = [new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)];
			var aParms = oView.getModel("JScreenParm").getProperty("/List") || [];
			if (aParms.length > 0) {
				oParmRow = aParms[0];
				for (var i = 1; i <= 4; i++) {
					sFieldId = oParmRow["WfParm" + i + "Id"];
					if (sFieldId) {
						oInput = sap.ui.getCore().byId(sFieldId) || this.byId(sFieldId);
						if (oInput) {
							var sValue = oInput.getValue().trim();
							if (sValue) {
								aFilter.push(new sap.ui.model.Filter("WfParm" + i, sap.ui.model.FilterOperator.EQ, sValue));
							}
						}
					}
				}
			}
			var that = this;
			oModel.read("/WFMainSet", {
				filters: aFilter,
				urlParameters: {
					"$expand": "Navleveldef,Navagentassign"
				},
				success: function(oData) {
					var aResults = oData.results || [];
					var oGDModel = new sap.ui.model.json.JSONModel({
						GDTableData: aResults
					});
					that.getView().setModel(oGDModel, "GDTableModel");
					if (aResults.length > 0) {
						that.byId("id_ResultTable").setVisibleRowCount(10);
						oTable.setSelectedIndex(0);
						that.onRowSelectionChange();
					} else {
						oTable.setVisibleRowCount(10);
						oLDModel.setProperty("/tableDataNew", []);
						oAAModel.setProperty("/tableDataAA", []);
					}
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}

			});

			this.byId("id_change").setEnabled(true);
			this.byId("id_search").setEnabled(false);
			this.byId("id_ChngeSrch").setEnabled(true);
			this.byId("id_forAgent").setEnabled(true);
			this.byId("id_Masschange").setEnabled(true);
			this.byId("WID_APPID").setEditable(false);
			if (aParms.length > 0) {
				oParmRow = aParms[0];
				for (var j = 1; j <= 4; j++) {
					sFieldId = oParmRow["WfParm" + j + "Id"];
					if (sFieldId) {
						oInput = this.getView().byId(sFieldId).setEditable(false);
					}
				}
			}
			oTable.setSelectedIndex(0);

		},

		// *--------------------------------------------------------------------------------------
		//				To set the first data as select and row selection change
		// *--------------------------------------------------------------------------------------
		onRowSelectionChange: function(oEvent) {
			if (this._bSkipLDLoad || this._bRevertSelection) {
				return;
			}
			var oLDModel;
			var aLDData;
			var iLDLastIndex;
			var oTable;
			oTable = this.byId("id_ResultTable");
			var oLDTable = this.byId("id_LDTable");
			var iIndex = oTable.getSelectedIndex();
			if (iIndex < 0) {
				return;
			}

			var oModel = this.getView().getModel("GDTableModel"); // Added by srikanth
			if (!oModel) {
				return;
			}

			var aData = oModel.getProperty("/GDTableData") || [];

			var iLastIndex = aData.length - 1;
			var oLastRow = aData[iLastIndex];

			// Prevent changing selection if last row is still unsaved
			var that = this;
			if (this.change === true) {
				setTimeout(function() {
					oTable = that.byId("id_ResultTable");
					oTable.setSelectedIndex(0);
					that.change = false;
				}, 200);
			} else if (oLastRow && oLastRow.isNew && iIndex !== iLastIndex) {
				ErrorHandler.showCustomSnackbar("Please save the current row before selecting another.", "Error", this);

				this._bRevertSelection = true;
				oTable.setSelectedIndex(iLastIndex); // triggers 2nd call, but will be ignored
				this._bRevertSelection = false;

				var totalRowCnt = oTable.getVisibleRowCount();
				if (iLastIndex > totalRowCnt) {
					oTable.scrollToIndex(iLastIndex);
				}
				// Select last row in LD table
				oLDModel = this.getView().getModel("LDTableModel");
				aLDData = oLDModel.getProperty("/tableDataNew") || [];
				if (aLDData.length > 0) {
					iLDLastIndex = aLDData.length - 1;
					this.byId("id_LDTable").setSelectedIndex(iLDLastIndex);
					this.onLDRowSelectionChange();
				}
				return;
			}
			// current working logic //
			else if (
				oLastRow &&
				iIndex !== iLastIndex &&
				(oLastRow.isNew || this.fnCheckUnsaveLevelData(oLastRow))
			) {
				ErrorHandler.showCustomSnackbar("Please save the current row before selecting another.", "Error", this);

				this._bRevertSelection = true;
				oTable.setSelectedIndex(iLastIndex); // triggers 2nd call, but will be ignored
				this._bRevertSelection = false;
				if (iLastIndex > totalRowCnt) {
					oTable.scrollToIndex(iLastIndex);
				}
				// Select last row in LD table
				oLDModel = this.getView().getModel("LDTableModel");
				aLDData = oLDModel.getProperty("/tableDataNew") || [];
				if (aLDData.length > 0) {
					iLDLastIndex = aLDData.length - 1;
					this.byId("id_LDTable").setSelectedIndex(iLDLastIndex);
					this.onLDRowSelectionChange();
				}

				return;
			}

			// Proceed with your existing logic
			if (this._bAddEnabled) {
				this._bAddEnabledLD = true;
				this.byId("AddImage1").removeStyleClass("cl_AddDelete");
			} else {
				this._bAddEnabled = false;
				this.byId("AddImage1").addStyleClass("cl_AddDelete");
			}

			var oCtx = oTable.getContextByIndex(iIndex);
			if (!oCtx || !oCtx.getObject()) {
				// No data available — clear models 
				this._oSelectedWFMainRow = null;
				this.getView().getModel("LDTableModel").setProperty("/tableDataNew", []);
				this.getView().getModel("AATableModel").setProperty("/tableDataAA", []);

				return;
			}

			var oSelectedWFMainRow = oCtx.getObject();
			this._oSelectedWFMainRow = oSelectedWFMainRow;

			// Populate LD Table
			aLDData = (oSelectedWFMainRow.Navleveldef && oSelectedWFMainRow.Navleveldef.results) || [];
			aLDData.forEach(function(entry) {
				if (entry.TypeLvl === "I") {
					entry.TypeLvl = "Initiator";
				}
				if (entry.TypeLvl === "R") {
					entry.TypeLvl = "Reviewer";
				}
				if (entry.TypeLvl === "A") {
					entry.TypeLvl = "Approver";
				}
				if (entry.Type === "P") {
					entry.Type = "Parallel";
				}
				if (entry.Type === "S") {
					entry.Type = "Sequential";
				}
				if (entry.Active === true) {
					entry.Active = "True";
				}
			});

			oLDModel = new sap.ui.model.json.JSONModel({
				tableDataNew: aLDData
			});
			this.getView().setModel(oLDModel, "LDTableModel");

			oLDTable = this.byId("id_LDTable");
			this._iSelectedLDIndex = undefined;
			if (oLDModel.getProperty("/tableDataNew").length > 0) {
				oLDTable.setSelectedIndex(0);
				this.onLDRowSelectionChange();
			}
		},

		fnCheckUnsaveLevelData: function(oWFRow) {
			var aLDLevels = (oWFRow.Navleveldef && oWFRow.Navleveldef.results) || [];
			return aLDLevels.some(function(ld) {
				return ld.isNew || !ld.Lvl || ld.Lvl.trim() === "";
			});
		},

		onLDRowSelectionChange: function(oEvent) {
			var oPrevLDRow;
			var oTable = this.byId("id_LDTable");
			var iIndex = oTable.getSelectedIndex();
			var oViewModel = this.getView().getModel("viewModel");

			if (iIndex < 0 || !this._oSelectedWFMainRow) {
				// No selection: make inputs and ComboBox non-editable

				oViewModel.setProperty("/isEditable", false);
				oViewModel.setProperty("/isComboEditable", false);
				oViewModel.setProperty("/isActiveEditable", false);
				return;
			}

			// Selection exists: make inputs and ComboBox editable
			oViewModel.setProperty("/selectedLDIndex", iIndex);
			var aLDData = this.getView().getModel("LDTableModel").getProperty("/tableDataNew") || [];

			if (this._bIsEditMode) {
				aLDData.forEach(function(row, index) {
					if (index === iIndex && aLDData[iIndex].Lvl !== "L0" &&
						(aLDData[iIndex].Type === "Sequential" || aLDData[iIndex].Type === "Parallel")) {
						row.isRowEditable = true;
					} else {
						row.isRowEditable = false;
					}
					row.isTypeEditable = (index === iIndex);
				});

				this.getView().getModel("LDTableModel").setProperty("/tableDataNew", aLDData);
				oViewModel.setProperty("/isEditable", true);
				oViewModel.setProperty("/isComboEditable", true);
			}
			if (this._iSelectedLDIndex !== undefined && oTable.getContextByIndex(this._iSelectedLDIndex)) {
				oPrevLDRow = oTable.getContextByIndex(this._iSelectedLDIndex).getObject();
				if (oPrevLDRow) {
					if (this._bIsAddingLDRow) {
						this._bIsAddingLDRow = false; // Reset the flag
					} else {
						if (!this.fnChecklevelRowAgentComplete(this._iSelectedLDIndex)) {
							oTable.setSelectedIndex(this._iSelectedLDIndex); // Revert selection
							return;
						}
					}
				}
			}

			this._iSelectedLDIndex = undefined;
			// var flag = oTable.getContextByIndex(this._iSelectedLDIndex).getObject().isNew;
			if (this._iSelectedLDIndex !== undefined && oTable.getContextByIndex(this._iSelectedLDIndex)) {

				oPrevLDRow = oTable.getContextByIndex(this._iSelectedLDIndex).getObject();

				var sPrevLvl = oPrevLDRow.Lvl;

				var oAAModel = this.getView().getModel("AATableModel");
				var aAllAARows = oAAModel ? oAAModel.getProperty("/tableDataAA") : [];

				var bSameLevelData = aAllAARows && aAllAARows.length > 0 &&
					aAllAARows[0].LvlFromLD === sPrevLvl;

				if (bSameLevelData && sPrevLvl) {
					if (oPrevLDRow.isNew) {
						oPrevLDRow.Navagentassign = {
							results: aAllAARows
						};
					} else {
						var aAllAgents = this._oSelectedWFMainRow.Navagentassign &&
							this._oSelectedWFMainRow.Navagentassign.results || [];

						aAllAgents = aAllAgents.filter(function(agent) {
							return !(
								agent.Lvl === sPrevLvl &&
								agent.WfParm1 === oPrevLDRow.WfParm1 &&
								agent.WfParm2 === oPrevLDRow.WfParm2 &&
								agent.WfParm3 === oPrevLDRow.WfParm3 &&
								agent.WfParm4 === oPrevLDRow.WfParm4
							);
						}).concat(aAllAARows);

						this._oSelectedWFMainRow.Navagentassign.results = aAllAgents;

					}
				}
			}
			// this._iSelectedLDIndex = undefined; 

			// Continue with new selection
			var oSelectedLDRow = oTable.getContextByIndex(iIndex).getObject();
			this._iSelectedLDIndex = iIndex;

			// var oToday = new Date();
			// var sFormattedDate = String(oToday.getDate()).padStart(2, '0') + "." +
			// 	String(oToday.getMonth() + 1).padStart(2, '0') + "." + oToday.getFullYear();

			// Handle L0
			if (oSelectedLDRow.isNew && oSelectedLDRow.Lvl === "L0") {

				var oAARow = {
					Active: true,
					StartDate: new Date(),
					EndDate: "",
					Variant: "COMMON",
					Agent: "",
					Name: "",
					Dept: "",
					LvlFromLD: oSelectedLDRow.Lvl,
					isNew: true,
					isRowEditable: false
				};
				oSelectedLDRow.Navagentassign = {
					results: [oAARow]
				};
				this.getView().setModel(
					new sap.ui.model.json.JSONModel({
						tableDataAA: [oAARow]
					}),
					"AATableModel"
				);
				return;

			}

			var aAgents = [];
			if (oSelectedLDRow.Navagentassign && oSelectedLDRow.Navagentassign.results) {

				aAgents = oSelectedLDRow.Navagentassign.results;
			} else {

				var aAllSavedAgents = this._oSelectedWFMainRow.Navagentassign &&
					this._oSelectedWFMainRow.Navagentassign.results || [];

				aAgents = aAllSavedAgents.filter(function(agent) {
					return agent.Lvl === oSelectedLDRow.Lvl &&
						agent.WfParm1 === oSelectedLDRow.WfParm1 &&
						agent.WfParm2 === oSelectedLDRow.WfParm2 &&
						agent.WfParm3 === oSelectedLDRow.WfParm3 &&
						agent.WfParm4 === oSelectedLDRow.WfParm4;
				});

				oSelectedLDRow.Navagentassign = {
					results: aAgents
				};
			}

			for (var i = 0; i < aAgents.length; i++) {
				aAgents[i].LvlFromLD = oSelectedLDRow.Lvl;
				aAgents[i].isEditable = (oSelectedLDRow.Lvl !== "L0");
			}

			this.getView().setModel(
				new sap.ui.model.json.JSONModel({
					tableDataAA: aAgents
				}),
				"AATableModel"
			);

			var oAATable = this.byId("id_Agent");
			oAATable.setVisibleRowCount(4);
			if (aAgents.length > 0) {
				setTimeout(function() {
					oAATable.setSelectedIndex(0);
				}, 0);
			}
		},

		fnChecklevelRowAgentComplete: function(iRowIndexToValidate) {
			var oView = this.getView();
			var oLDTable = oView.byId("id_LDTable");
			// var oLDModel = oView.getModel("LDTableModel");
			var oAAModel = oView.getModel("AATableModel");

			var aAARows = oAAModel.getProperty("/tableDataAA") || [];

			if (iRowIndexToValidate < 0) return true;

			var oRowContext = oLDTable.getContextByIndex(iRowIndexToValidate);
			if (!oRowContext) return true;

			var oLDRow = oRowContext.getObject();
			if (!oLDRow || !oLDRow.Lvl) return true;

			// skip for lvl 0
			if (oLDRow.Lvl === "L0") {
				return true;
			}
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var bIsMassMaterial = sAppId.startsWith("MM") || sAppId.startsWith("RC") || sAppId.startsWith("BC") || sAppId.startsWith("PVMC") ||
				sAppId.startsWith("BX") || sAppId.startsWith("RX") || sAppId.startsWith("PHC") || sAppId.startsWith("PHX") || sAppId.startsWith(
					"PM") ||
				sAppId.startsWith("MG");
			// Check if LD row is fully filled
			var bLDRowComplete =
				oLDRow.Type && oLDRow.Type.trim() !== "" &&
				oLDRow.MinAppr && oLDRow.MinAppr.trim() !== "" &&
				oLDRow.MaxRole && oLDRow.MaxRole.trim() !== "";

			// Agent assignments check
			var sLvl = oLDRow.Lvl;
			var aFilteredAARows = aAARows.filter(function(row) {
				return row.LvlFromLD === sLvl;
			});

			var bAgentsComplete = true;

			if (oLDRow.Type === "Parallel") {
				var iMinAppr = parseInt(oLDRow.MinAppr || "0", 10);
				var iValidCount = aFilteredAARows.filter(function(row) {
					return row.Agent && row.Name &&
						row.Agent.trim() !== "" && row.Name.trim() !== "" &&
						row.EndDate !== "" &&
						(bIsMassMaterial || (row.Variant && row.Variant.trim() !== ""));
				}).length;
				bAgentsComplete = iValidCount >= iMinAppr;

			} else if (oLDRow.Type === "Sequential") {
				var oLast = aFilteredAARows[aFilteredAARows.length - 1];
				bAgentsComplete = oLast &&
					oLast.Agent && oLast.Agent.trim() !== "" &&
					oLast.EndDate !== "" &&
					(bIsMassMaterial || (oLast.Variant && oLast.Variant.trim() !== ""));
			}

			// Show validation message
			if (!bLDRowComplete && !bAgentsComplete) {
				ErrorHandler.showCustomSnackbar("Please complete both Level and Agent Assignment details.", "Error", this);
				return false;
			} else if (!bLDRowComplete) {
				ErrorHandler.showCustomSnackbar("Please complete all Level details.", "Error", this);
				return false;
			} else if (!bAgentsComplete) {
				ErrorHandler.showCustomSnackbar("Please complete all Agent Assignment details.", "Error", this);
				return false;
			}

			return true;
		},

		onAASelectionChange: function(oEvent) {
			var oTable = oEvent.getSource();
			var oModel = this.getView().getModel("AATableModel");
			var aRows = oModel.getProperty("/tableDataAA") || [];
			var iOldIndex = (this._iLastSelectedIndex >= 0) ? this._iLastSelectedIndex : -1;
			var iNewIndex = oEvent.getParameter("rowIndex");
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var bIsMassMaterial = sAppId.startsWith("MM") || sAppId.startsWith("RC") || sAppId.startsWith("BC") || sAppId.startsWith("PVMC") ||
				sAppId.startsWith("BX") || sAppId.startsWith("RX") || sAppId.startsWith("PHC") || sAppId.startsWith("PHX") || sAppId.startsWith(
					"PM") ||
				sAppId.startsWith("MG");
			if (iOldIndex >= 0 && aRows[iOldIndex]) {
				var oRow = aRows[iOldIndex];
				// Validation only for non-L0 rows
				if (oRow.LvlFromLD !== "L0") {
					var bHasError = !oRow.Agent || !oRow.Name || (!bIsMassMaterial && (!oRow.Variant || oRow.Variant.trim() === "")) || !oRow.EndDate;
					if (bHasError) {
						ErrorHandler.showCustomSnackbar("Please fill all required fields before selecting another row.", "Error", this);
						oTable.setSelectedIndex(iOldIndex);
						return;
					}
				}
			}

			// Update isRowEditable strictly
			aRows.forEach(function(row, index) {
				if (row.LvlFromLD === "L0") {
					row.isRowEditable = false;
				} else {
					row.isRowEditable = (index === iNewIndex);
				}
			});

			oModel.setProperty("/tableDataAA", aRows);
			this._iLastSelectedIndex = iNewIndex;
		},

		onLDTypeChange: function(oEvent) {
			var oComboBox = oEvent.getSource();
			var sEnteredText = oComboBox.getValue(); // Text entered manually
			var sSelectedKey = oComboBox.getSelectedKey(); // Will be empty if typed
			var oContext = oComboBox.getBindingContext("LDTableModel");
			if (!oContext) return;

			// Match entered text with ComboBox items
			var aItems = oComboBox.getItems();
			var bValid = false;
			var sKeyFromText = "";

			for (var i = 0; i < aItems.length; i++) {
				var oItem = aItems[i];
				if (oItem.getText() === sEnteredText) {
					bValid = true;
					sKeyFromText = oItem.getKey();
					break;
				}
			}

			if (!bValid) {
				ErrorHandler.showCustomSnackbar("Invalid value. Please select a valid Type.", "Error", this);
				oComboBox.setValue(""); // Clear input field
				oContext.getModel().setProperty(oContext.getPath() + "/Type", ""); // Adjust path if Type is the property
				return;
			}

			var sNewType = sKeyFromText; // 'Parallel' or 'Sequential'
			var oLDModel = oContext.getModel();
			var oRow = oContext.getObject();
			var sLvl = oRow.Lvl;

			// Count matching agents
			var oAAModel = this.getView().getModel("AATableModel");
			var aAARows = oAAModel.getProperty("/tableDataAA") || [];

			var iAgentCount = 0;
			for (var j = 0; j < aAARows.length; j++) {
				if (aAARows[j].LvlFromLD === sLvl) {
					iAgentCount++;
				}
			}

			if (sNewType === "Sequential") {
				oRow.MinAppr = iAgentCount > 0 ? String(iAgentCount) : "";
			}

			// Update isRowEditable flag
			var aLDData = oLDModel.getProperty("/tableDataNew") || [];
			var iIndex = -1;
			for (var k = 0; k < aLDData.length; k++) {
				if (aLDData[k].Lvl === sLvl) {
					iIndex = k;
					break;
				}
			}

			if (iIndex !== -1) {
				if (sNewType === "Sequential" && sLvl === "L0") {
					aLDData[iIndex].isRowEditable = false;
				} else {
					aLDData[iIndex].isRowEditable = true;
				}
				aLDData[iIndex].isTypeEditable = true;
				aLDData[iIndex].Type = sNewType;
				oLDModel.setProperty("/tableDataNew", aLDData);
				oLDModel.refresh(true);
			}

			oComboBox.setSelectedKey(sNewType);
		},

		// *--------------------------------------------------------------------------------------
		//				On Save Button Press functionlaities
		// *--------------------------------------------------------------------------------------
		onSaveWorkflow: function() {
			if (!this.validateBeforeSave()) {
				return;
			}
			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you sure you want to save?",
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "WorkflowSave"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},

		validateBeforeSave: function() {
			var oGDTableModel = this.getView().getModel("GDTableModel");
			var aData = oGDTableModel.getProperty("/GDTableData") || [];

			if (aData.length === 0) {
				ErrorHandler.showCustomSnackbar("General Data is missing.", "Error", this);
				return false;
			}
			// Safe emptiness check
			function isEmptyField(val) {
				return val === undefined || val === null || (typeof val === "string" && val.trim() === "");
			}
			var oLastRow = aData[aData.length - 1];

			var oWFParmModel = this.getView().getModel("jm_wfparm");
			var aGDProps = (oWFParmModel && oWFParmModel.getProperty("/GDFieldValueProps")) || ["WfParm1"];

			var bMissingField = aGDProps.some(function(prop) {
				var val = oLastRow[prop];
				return isEmptyField(val);
			});

			if (bMissingField) {
				ErrorHandler.showCustomSnackbar("Please complete the previous row before adding a new one", "Information", this);
				return;
			}

			var oView = this.getView();
			var oLDModel = oView.getModel("LDTableModel");
			var aLDData = oLDModel.getProperty("/tableDataNew") || [];
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var bIsMassMaterial = sAppId.toUpperCase().startsWith("MM") || sAppId.startsWith("RC") || sAppId.startsWith("BC") || sAppId.startsWith(
					"PVMC") || sAppId.startsWith("BX") || sAppId.startsWith("RX") || sAppId.startsWith("PHC") || sAppId.startsWith("PHX") || sAppId.startsWith(
					"PM") ||
				sAppId.startsWith("MG");

			function isVariantValid(agent) {
				return bIsMassMaterial || (agent.Variant && agent.Variant.trim() !== "");
			}
			var aAllAgents = (this._oSelectedWFMainRow.Navagentassign && this._oSelectedWFMainRow.Navagentassign.results) || [];

			if (!aLDData.length) {
				ErrorHandler.showCustomSnackbar("Please define at least one Level.", "Error", this);
				return false;
			}

			var hasAnyAgent = false;
			var hasApproverLevel = false;

			for (var i = 0; i < aLDData.length; i++) {
				var ld = aLDData[i];

				if (!ld.Lvl || !ld.TypeLvl || !ld.Type) {
					ErrorHandler.showCustomSnackbar("Level definition incomplete for level " + (ld.Lvl || "(unknown)") + ".", "Error", this);
					return false;
				}

				if (ld.TypeLvl === "Approver") {
					hasApproverLevel = true;
				}

				if (ld.Lvl === "L0") {
					continue;
				}

				if (ld.Type === "Parallel" && (!ld.MinAppr || ld.MinAppr.trim() === "")) {
					ErrorHandler.showCustomSnackbar("Min role missing for Parallel level " + ld.Lvl + ".", "Error", this);
					return false;
				}

				var iMinAppr = parseInt(ld.MinAppr || "0", 10);

				var aAgents = [];

				if (ld.Navagentassign && ld.Navagentassign.results) {
					aAgents = ld.Navagentassign.results;
				} else {
					aAgents = aAllAgents.filter(function(agent) {
						return agent.Lvl === ld.Lvl;
					});
				}

				if (aAgents.length > 0) {
					hasAnyAgent = true;
				}

				if (ld.Type === "Parallel") {
					if (aAgents.length < iMinAppr) {
						ErrorHandler.showCustomSnackbar("Level " + ld.Lvl + ": At least " + iMinAppr + " agents required for Parallel.", "Error", this);
						return false;
					}

					var iComplete = aAgents.filter(function(agent) {
						return agent.Active !== false && agent.Agent && agent.Agent.trim() !== "" &&
							agent.Name && agent.Name.trim() !== "" &&
							agent.EndDate && isVariantValid(agent);
					}).length;

					if (iComplete < iMinAppr) {
						ErrorHandler.showCustomSnackbar("Parallel level " + ld.Lvl + " requires at least " + iMinAppr + " fully filled agents.", "Error",
							this);
						return false;
					}
					var bHasIncomplete = aAgents.some(function(agent) {
						return !agent.Agent || agent.Agent.trim() === "" ||
							!agent.Name || agent.Name.trim() === "" ||
							!agent.EndDate ||
							!isVariantValid(agent);
					});

					if (bHasIncomplete) {
						ErrorHandler.showCustomSnackbar("Parallel level " + ld.Lvl + " contains incomplete agent entries.", "Error", this);
						return false;
					}
				}

				if (ld.Type === "Sequential") {
					if (aAgents.length < 1) {
						ErrorHandler.showCustomSnackbar("Sequential level should have atleast 1 agent", "Error", this);
						return false;
					}
					var bAllComplete = aAgents.every(function(agent) {
						return agent.Active !== false && agent.Agent && agent.Agent.trim() !== "" &&
							agent.EndDate && isVariantValid(agent);
					});

					if (!bAllComplete) {
						ErrorHandler.showCustomSnackbar("All agents for Sequential level " + ld.Lvl + " must be fully filled.", "Error", this);
						return false;
					}
				}

				for (var j = 0; j < aAgents.length; j++) {
					var agent = aAgents[j];
					if (!agent.Agent || !agent.Role) {
						ErrorHandler.showCustomSnackbar("Level " + ld.Lvl + ": Agent and Role must be filled.", "Error", this);
						return false;
					}
				}
			}

			if (!hasAnyAgent) {
				ErrorHandler.showCustomSnackbar("Please assign at least one Agent.", "Error", this);
				return false;
			}

			if (!hasApproverLevel) {
				ErrorHandler.showCustomSnackbar("At least one level must have Area set to 'Approver'.", "Error", this);
				return false;
			}

			return true;
		},

		onSaveWorkflowData: function() {

			var that = this;
			this.byId("id_Copy").setEnabled(true);
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var oLDModel = this.getView().getModel("LDTableModel");
			var aLDData = oLDModel.getProperty("/tableDataNew") || [];

			if (!aLDData.length) {
				ErrorHandler.showCustomSnackbar("No data to save.", "Error", this);
				return;
			}

			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var oTable = this.byId("id_ResultTable");
			var iSelectedIndex = oTable.getSelectedIndex();
			if (iSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please select a row in the table.", "Error", this);
				return;
			}
			var oSelectedRow = oTable.getContextByIndex(iSelectedIndex).getObject();
			var sWfParm1 = oSelectedRow.WfParm1 || "";
			var sWfParm2 = oSelectedRow.WfParm2 || "";
			var sWfParm3 = oSelectedRow.WfParm3 || "";
			var sWfParm4 = "";

			function convertActive(v) {
				return v === true || v === "True" || v === "X";
			}

			function convertType(t) {
				if (t === "Parallel") {
					return "P";
				}
				if (t === "Sequential") {
					return "S";
				}
				return t;
			}

			function convertTypeLvl(a) {
				if (a === "Initiator") {
					return "I";
				}
				if (a === "Reviewer") {
					return "R";
				}
				if (a === "Approver") {
					return "A";
				}
				return a;
			}

			function convertUIDateToBackend(oDateInput) {
				if (!oDateInput) {
					return null;
				}
				if (oDateInput instanceof Date && !isNaN(oDateInput.getTime())) {
					return new Date(Date.UTC(
						oDateInput.getFullYear(),
						oDateInput.getMonth(),
						oDateInput.getDate()
					)).toISOString().slice(0, 19);
				}
				if (typeof oDateInput === "string") {
					var parts = oDateInput.split(".");
					if (parts.length === 3) {
						var day = parseInt(parts[0], 10);
						var month = parseInt(parts[1], 10) - 1;
						var year = parseInt(parts[2], 10);
						var dateObj = new Date(Date.UTC(year, month, day));
						if (!isNaN(dateObj.getTime())) {
							return dateObj.toISOString().slice(0, 19);
						}
					}
				}
				return null;
			}

			function convertUIHrsToBackend(sTime) {
				if (!sTime) {
					return null;
				}
				var parts = sTime.split(":");
				var hh = parts[0].padStart(2, "0");
				var mm = (parts[1] || "00").padStart(2, "0");
				var ss = "00";
				return "PT" + hh + "H" + mm + "M" + ss + "S";
			}

			function convertBooleanToXSpace(value) {
				return value === true || value === "True" || value === "X" ? "X" : " ";
			}
			var oPayload = {
				AppId: sAppId,
				WfParm1: sWfParm1,
				WfParm2: sWfParm2,
				WfParm3: sWfParm3,
				WfParm4: sWfParm4,
				Flag: "S",
				Navleveldef: [],
				Navagentassign: [],
				Navmailfinal: [],
				Nav_wf_sla: []

			};

			// Levels
			aLDData.forEach(function(ld) {
				oPayload.Navleveldef.push({
					AppId: sAppId,
					WfParm1: sWfParm1,
					WfParm2: sWfParm2,
					WfParm3: sWfParm3,
					WfParm4: sWfParm4,
					TypeLvl: convertTypeLvl(ld.TypeLvl),
					Lvl: ld.Lvl,
					MaxRole: ld.MaxRole,
					MinAppr: ld.MinAppr,
					Type: convertType(ld.Type),
					Dept: ld.Dept
				});

				var aAllAgents = (that._oSelectedWFMainRow.Navagentassign && that._oSelectedWFMainRow.Navagentassign.results) || [];
				var aAgents = [];

				if (ld.Navagentassign && ld.Navagentassign.results) {
					aAgents = ld.Navagentassign.results;
				} else {
					aAgents = aAllAgents.filter(function(agent) {
						return agent.Lvl === ld.Lvl;
					});
				}
				aAgents.forEach(function(aa) {
					oPayload.Navagentassign.push({
						AppId: sAppId,
						WfParm1: sWfParm1,
						WfParm2: sWfParm2,
						WfParm3: sWfParm3,
						WfParm4: sWfParm4,
						StartDate: convertUIDateToBackend(aa.StartDate),
						EndDate: convertUIDateToBackend(aa.EndDate),
						Agent: aa.Agent,
						Name: aa.Name,
						MailId: " ",
						Variant: aa.Variant,
						Active: convertActive(aa.Active),
						Lvl: ld.Lvl,
						Role: aa.Role ? String(aa.Role).padStart(2, '0') : "01"
					});
				});
			});
			if (that._emailMap) {
				Object.keys(that._emailMap).forEach(function(lvl) {
					var aEmailList = that._emailMap[lvl];
					aEmailList.forEach(function(mail) {
						oPayload.Navmailfinal.push({
							AppId: sAppId,
							WfParm1: sWfParm1,
							WfParm2: sWfParm2,
							WfParm3: sWfParm3,
							WfParm4: sWfParm4,
							Lvl: mail.Lvl,
							MailId: mail.MailId
						});
					});
				});
			}

			if (that._slaMap) {
				Object.keys(that._slaMap).forEach(function(lvl) {
					var oSla = that._slaMap[lvl];
					var cleanLvl = lvl.split("|")[0];

					// REMINDER block
					if (oSla.ReminderDays || oSla.ReminderTime) {
						(oSla.Emails.REMINDER || []).forEach(function(mailObj) {
							oPayload.Nav_wf_sla.push({
								AppId: sAppId,
								WfParm1: sWfParm1,
								WfParm2: sWfParm2,
								WfParm3: sWfParm3,
								WfParm4: sWfParm4,
								Lvl: cleanLvl,
								Process: "REMINDER",
								ExsitingApprover: convertBooleanToXSpace(oSla.ExsitingApprover),
								MailId: mailObj.MailId || "",
								MailType: "REMINDER",
								WfDays: oSla.ReminderDays || null,
								WfHours: convertUIHrsToBackend(oSla.ReminderTime),
								Flag: ""
							});
						});
					}

					// ESCALATION block
					if (oSla.EscalationDays || oSla.EscalationTime) {
						(oSla.Emails.ESCALATION || []).forEach(function(mailObj) {
							oPayload.Nav_wf_sla.push({
								AppId: sAppId,
								WfParm1: sWfParm1,
								WfParm2: sWfParm2,
								WfParm3: sWfParm3,
								WfParm4: sWfParm4,
								Lvl: cleanLvl,
								Process: "ESCALATION",
								ExsitingApprover: convertBooleanToXSpace(oSla.ExsitingApprover),
								MailId: mailObj.MailId || "",
								MailType: "ESCALATION",
								WfDays: oSla.EscalationDays,
								WfHours: convertUIHrsToBackend(oSla.EscalationTime),
								Flag: ""
							});
						});
					}
					(oSla.Emails.ALL || []).forEach(function(mailObj) {
						if (oSla.ReminderDays || oSla.ReminderTime) {
							oPayload.Nav_wf_sla.push({
								AppId: sAppId,
								WfParm1: sWfParm1,
								WfParm2: sWfParm2,
								WfParm3: sWfParm3,
								WfParm4: sWfParm4,
								Lvl: cleanLvl,
								Process: "REMINDER",
								ExsitingApprover: convertBooleanToXSpace(oSla.ExsitingApprover),
								MailId: mailObj.MailId || "",
								MailType: "ALL",
								WfDays: oSla.ReminderDays,
								WfHours: convertUIHrsToBackend(oSla.ReminderTime),
								Flag: ""
							});
						}
						if (oSla.EscalationDays || oSla.EscalationTime) {
							oPayload.Nav_wf_sla.push({
								AppId: sAppId,
								WfParm1: sWfParm1,
								WfParm2: sWfParm2,
								WfParm3: sWfParm3,
								WfParm4: sWfParm4,
								Lvl: cleanLvl,
								Process: "ESCALATION",
								ExsitingApprover: convertBooleanToXSpace(oSla.ExsitingApprover),
								MailId: mailObj.MailId || "",
								MailType: "ALL",
								WfDays: oSla.EscalationDays || null,
								WfHours: convertUIHrsToBackend(oSla.EscalationTime),
								Flag: ""
							});
						}
					});
				});
			}
			oModel.setUseBatch(false);
			oModel.create("/WFMainSet", oPayload, {
				success: function() {
					ErrorHandler.showCustomSnackbar("Workflow saved successfully.", "success", that);
					var oGDModel = that.getView().getModel("GDTableModel");
					var aGDData = oGDModel ? oGDModel.getProperty("/GDTableData") : [];
					if (aGDData && aGDData.length > 0) {
						aGDData.forEach(function(row) {
							delete row.isNew;
						});
						if (oGDModel) {
							oGDModel.setProperty("/GDTableData", aGDData);
						}
					}
					that.fnrestoreSavedLevelSelection(iSelectedIndex);
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		// *--------------------------------------------------------------------------------------
		//				Submit confirmation logice based on the action it will trigger
		// *--------------------------------------------------------------------------------------

		onConfirmSubmit: function() {
			var oModel = this.getView().getModel("CONFIRM_MODEL");
			var sAction = oModel.getProperty("/action");
			this.confirmfrag.close();
			// Handle actions dynamically
			switch (sAction) {
				case "GeneralDelete":
					this.onDeleteWorkflowData();
					break;
				case "WorkflowSave":
					this.onSaveWorkflowData();
					break;
					// case "Unsaved":
					// 	this.onConfirmProceed();
					// 	break;
					// case "VariantSave":
					// 	this.FnchangeVar();
					// 	break;
					// case "VariantDelete":
					// 	this.onDeleteSelectedVariants();
					// 	break;
				case "Edit":
					this.onConfirmYes();
					break;
				case "ChangeSearch":
					this.onConfirmChangeSearch();
					break;
				case "AgentDelete":
					this.onDeleteSelectedRowsAA();
					break;
				case "VariantEditExit":
					this.onConfirmExitYes();
					break;
				case "LevelDelete":
					this.onDeleteSelectedRowsLD();
					break;
					// case "MassDelete":
					// 	this.fn_MassDeletePress();
					// 	break;

			}
		},

		onConfirmCancel: function() {
			this.confirmfrag.close();
		},

		// *--------------------------------------------------------------------------------------
		//				save the the data and retrive the data set to the table
		// *--------------------------------------------------------------------------------------
		fnrestoreSavedLevelSelection: function(iSelectedIndex) {
			var oView = this.getView();
			var oAppInput = oView.byId("WID_APPID");
			var sFullValue = oAppInput ? oAppInput.getValue().trim() : "";
			var sAppId = sFullValue.split("-")[0].trim();

			if (!sAppId) {
				ErrorHandler.showCustomSnackbar("Please enter Application ID", "Error", this);
				return;
			}

			// Build filters dynamically
			var aFilter = [new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)];

			var aParms = oView.getModel("JScreenParm").getProperty("/List") || [];
			if (aParms.length > 0) {
				var oParmRow = aParms[0];
				for (var i = 1; i <= 4; i++) {
					var sFieldId = oParmRow["WfParm" + i + "Id"];
					if (sFieldId) {
						var oInput = sap.ui.getCore().byId(sFieldId) || this.byId(sFieldId);
						if (oInput) {
							var sValue = oInput.getValue().trim();
							if (sValue) {
								aFilter.push(new sap.ui.model.Filter("WfParm" + i, sap.ui.model.FilterOperator.EQ, sValue));
							}
						}
					}
				}
			}

			var that = this;
			var oTable = oView.byId("id_ResultTable");
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			oModel.read("/WFMainSet", {
				filters: aFilter,
				urlParameters: {
					"$expand": "Navleveldef,Navagentassign"
				},
				success: function(oData) {
					var aResults = oData.results || [];
					var oGDModel = new sap.ui.model.json.JSONModel({
						GDTableData: aResults
					});
					that.getView().setModel(oGDModel, "GDTableModel");

					// var iRowCount = Math.min(aResults.length, 11);
					oTable.setVisibleRowCount(10);

					// Determine which index to select
					var iSelect = (typeof iSelectedIndex === "number" && iSelectedIndex >= 0 && iSelectedIndex < aResults.length) ? iSelectedIndex :
						0;

					oTable.setSelectedIndex(iSelect);
					oTable.setFirstVisibleRow(iSelect);
					that._iSelectedGDIndex = iSelect;
					that.onRowSelectionChange(); // only call if row index has changed
					setTimeout(function() {
						var oLDTable = that.byId("id_LDTable");
						var oAATable = that.byId("id_Agent");

						if (oLDTable && that._iPrevLevelIndex >= 0 && that._iPrevLevelIndex < oLDTable.getBinding().getLength()) {
							oLDTable.setSelectedIndex(that._iPrevLevelIndex);
						}

						if (oAATable && that._iPrevAgentIndex >= 0 && that._iPrevAgentIndex < oAATable.getBinding().getLength()) {
							oAATable.setSelectedIndex(that._iPrevAgentIndex);
						}

						// Trigger dependent logic only if valid selection exists
						// if (that._iPrevLevelIndex >= 0){ that.onLDSelectionChange();}
						// if (that._iPrevAgentIndex >= 0){ that.onAgentSelectionChange();}
						that._iPrevLevelIndex = null;
						that._iPrevAgentIndex = null;
					}, 500);
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		fnSaveGdBehaviour: function() {
			var oView = this.getView();
			var oLDModel = oView.getModel("LDTableModel");
			var oAAModel = oView.getModel("AATableModel");
			var oAppInput = this.byId("WID_APPID");
			var sFullValue = oAppInput ? oAppInput.getValue().trim() : "";
			var sAppId = sFullValue.split("-")[0].trim();

			var oModel = this.getOwnerComponent().getModel("JMConfig");

			var aFilter = [new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)];
			var aParms = oView.getModel("JScreenParm").getProperty("/List") || [];
			if (aParms.length > 0) {
				var oParmRow = aParms[0];
				for (var i = 1; i <= 4; i++) {
					var sFieldId = oParmRow["WfParm" + i + "Id"];
					if (sFieldId) {
						var oInput = sap.ui.getCore().byId(sFieldId) || this.byId(sFieldId);
						if (oInput) {
							var sValue = oInput.getValue().trim();
							if (sValue) {
								aFilter.push(new sap.ui.model.Filter("WfParm" + i, sap.ui.model.FilterOperator.EQ, sValue));
							}
						}
					}
				}
			}

			var that = this;
			var oTable = this.byId("id_ResultTable");
			oModel.read("/WFMainSet", {
				filters: aFilter,
				urlParameters: {
					"$expand": "Navleveldef,Navagentassign"
				},
				success: function(oData) {
					var aResults = oData.results || [];
					var oGDModel = new sap.ui.model.json.JSONModel({
						GDTableData: aResults
					});
					that.getView().setModel(oGDModel, "GDTableModel");
					// console.log("Loaded GDTableModel:", aResults);
					if (aResults.length > 0) {
						// var iRowCount = Math.min(aResults.length, 11);
						that.byId("id_ResultTable").setVisibleRowCount(10);
						oTable.setSelectedIndex(0);
						oTable.setFirstVisibleRow(0);
						that.onRowSelectionChange();
					} else {
						oTable.setVisibleRowCount(10);
						oLDModel.setProperty("/tableDataNew", []);
						oAAModel.setProperty("/tableDataAA", []);
					}
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		// *--------------------------------------------------------------------------------------
		//				When change search button press
		// *--------------------------------------------------------------------------------------
		onChangeSearch: function() {
			// this.fn_ChangeSearch_frag();
			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Do you want to change the search criteria?",
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "ChangeSearch"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},

		onConfirmChangeSearch: function() {
			this.change = true;
			this._bIsEditMode = false;
			this.byId("id_LDTable").removeStyleClass("cl_maxfield");
			this.byId("id_search").setEnabled(true);
			this.byId("id_ChngeSrch").setEnabled(false);
			this.byId("id_forAgent").setEnabled(false);
			this.byId("id_saveWf").setEnabled(false);
			this.byId("id_Copy").setEnabled(false);
			this.byId("id_change").setEnabled(false);
			this.byId("WID_APPID").setEditable(true);
			this.byId("AddImage").addStyleClass("cl_AddDelete");
			this.byId("DelImage").addStyleClass("cl_AddDelete");
			this.byId("AddImage1").addStyleClass("cl_AddDelete");
			this.byId("DelImage1").addStyleClass("cl_AddDelete");
			this.byId("AddImage2").addStyleClass("cl_AddDelete");
			this.byId("DelImage2").addStyleClass("cl_AddDelete");
			this.byId("ID_AGENT_INPUT").removeStyleClass("cl_chtabInput");
			this._bAddEnabled = false;
			this._bAddEnabledLD = false;
			this.getView().getModel("viewModel").setProperty("/isComboEditable", false);
			this.getView().getModel("viewModel").setProperty("/isEditable", false);

			var oView = this.getView();
			var oMainModel = oView.getModel("GDTableModel");

			// Clear GD Model
			var oGDModel = oView.getModel("GDTableModel");
			if (oGDModel) {
				oGDModel.setProperty("/GDTableData", []);
				oGDModel.setProperty("/tableDataGD", []);
			}

			// Clear LD Model
			var oLDModel = oView.getModel("LDTableModel");
			if (oLDModel) {
				oLDModel.setProperty("/tableDataNew", []);
			}

			// Clear AA Model
			var oAAModel = oView.getModel("AATableModel");
			if (oAAModel) {
				oAAModel.setProperty("/tableDataAA", []);
			}

			// Refresh GD Table
			var oGDTable = this.byId("id_ResultTable");
			if (oGDTable && oGDTable.getBinding("rows")) {
				oGDTable.getBinding("rows").refresh();
			}

			// Refresh LD Table
			var oLDTable = this.byId("id_LDTable");
			if (oLDTable && oLDTable.getBinding("rows")) {
				oLDTable.getBinding("rows").refresh();
			}

			// Refresh AA Table
			var oAATable = this.byId("id_Agent");
			if (oAATable && oAATable.getBinding("rows")) {
				oAATable.getBinding("rows").refresh();
			}

			// Reset visible rows only for main table
			if (oGDTable) {
				oGDTable.setVisibleRowCount(10);
			}
			var aParms = oView.getModel("JScreenParm").getProperty("/List") || [];
			if (aParms.length > 0) {
				var oParmRow = aParms[0];
				for (var i = 1; i <= 4; i++) {
					var sFieldId = oParmRow["WfParm" + i + "Id"];
					if (sFieldId) {
						var oInput = this.getView().byId(sFieldId).setEditable(true);
						oInput.setValue("");
					}
				}
			}

			var aData = oMainModel.getProperty("/tableDataGD") || [];
			var aCleaned = [];
			for (var j = 0; j < aData.length; j++) {
				if (!aData[j].isNew) {
					aCleaned.push(aData[j]);
				}
			}

			oMainModel.setProperty("/tableDataGD", aCleaned);
			this.byId("id_ResultTable").clearSelection();
			this._iSelectedLDIndex = undefined;
			this._oSelectedLDRow = null;
		},

		// *--------------------------------------------------------------------------------------
		//				When Mass agent button press
		// *--------------------------------------------------------------------------------------
		onPressAgentChange: function() {
			this.fnMassAgentFrag();
		},

		fnMassAgentFrag: function(oEvent) {
			if (!this.MassAgentfrag) {
				this.MassAgentfrag = sap.ui.xmlfragment("massagentid", "WorkflowRules.fragment.MassAgent", this);
				this.getView().addDependent(this.MassAgentfrag);
			}
			this.MassAgentfrag.open();
			var oGroup = sap.ui.core.Fragment.byId("massagentid", "ID_MassAgent");
			if (oGroup) {
				oGroup.setSelectedIndex(0);
				// Trigger selection logic to build dynamic UI
				var Event = {
					getParameter: function(sName) {
						if (sName === "selectedIndex") {
							return oGroup.getSelectedIndex();
						}
					}
				};
				this.onMassAgentOptionSelect(Event);
			}
		},

		onMassAgentOptionSelect: function(oEvent) {
			var iSelectedIndex = oEvent.getParameter("selectedIndex");
			var oVBox = sap.ui.core.Fragment.byId("massagentid", "dynamicAgentBox");
			oVBox.getItems().forEach(function(oItem) {
				oItem.destroy();
			});
			oVBox.removeAllItems(); // Clear previous items

			if (iSelectedIndex === 2) { // Overall
				// Old Agent
				oVBox.addItem(new sap.m.HBox({
					alignItems: "Center",
					justifyContent: "Start",
					items: [
						new sap.m.Text({
							text: "Old Agent",
							width: "100px"
						}).addStyleClass("cl_inputLabel sapUiSmallMarginEnd"),
						new sap.m.Input({
							showValueHelp: true,
							valueHelpOnly: true,
							valueHelpRequest: function(oEvent) {
								this._oF4SourceInput = oEvent.getSource();
								this.fngetmassaddAgents(oEvent);
							}.bind(this)

						}).addStyleClass("cl_inputField")
					]
				}).addStyleClass("sapUiSmallMarginBegin"));

				// New Agent
				oVBox.addItem(new sap.m.HBox({
					alignItems: "Center",
					justifyContent: "Start",
					items: [
						new sap.m.Text({
							text: "New Agent",
							width: "100px"
						}).addStyleClass("cl_inputLabel sapUiSmallMarginEnd"),
						new sap.m.Input({

							showValueHelp: true,
							valueHelpOnly: true,
							valueHelpRequest: function(oEvent) {
								this._oF4SourceInput = oEvent.getSource();
								this.fngetmassaddAgents(oEvent);
							}.bind(this)
						}).addStyleClass("cl_inputField")
					]
				}).addStyleClass("sapUiSmallMarginBegin"));

			} else if (iSelectedIndex === 0) { // Application wise
				// App ID
				oVBox.addItem(new sap.m.HBox({
					alignItems: "Center",
					justifyContent: "Start",
					items: [
						new sap.m.Text({
							text: "App ID",
							width: "100px"
						}).addStyleClass("cl_inputLabel sapUiSmallMarginEnd"),

						new sap.m.MultiInput({
							showValueHelp: true,
							valueHelpOnly: true,
							tokenUpdate: function(oEvent) {
								// handle token deletion if needed
							},
							valueHelpRequest: function(oEvent) {
								this._oF4SourceInput = oEvent.getSource();
								this.fnGetMaasAppid(oEvent);
							}.bind(this)
						}).addStyleClass("cl_inputField")
					]
				}).addStyleClass("sapUiSmallMarginBegin"));

				// Old Agent
				oVBox.addItem(new sap.m.HBox({
					alignItems: "Center",
					justifyContent: "Start",
					items: [
						new sap.m.Text({
							text: "Old Agent",
							width: "100px"
						}).addStyleClass("cl_inputLabel sapUiSmallMarginEnd"),
						new sap.m.Input({
							showValueHelp: true,
							valueHelpOnly: true,
							valueHelpRequest: function(oEvent) {
								this._oF4SourceInput = oEvent.getSource();
								this.fngetmassaddAgents(oEvent);
							}.bind(this)
						}).addStyleClass("cl_inputField")
					]
				}).addStyleClass("sapUiSmallMarginBegin"));

				// New Agent
				oVBox.addItem(new sap.m.HBox({
					alignItems: "Center",
					justifyContent: "Start",
					items: [
						new sap.m.Text({
							text: "New Agent",
							width: "100px"
						}).addStyleClass("cl_inputLabel sapUiSmallMarginEnd"),
						new sap.m.Input({
							showValueHelp: true,
							valueHelpOnly: true,
							valueHelpRequest: function(oEvent) {
								this._oF4SourceInput = oEvent.getSource();
								this.fngetmassaddAgents(oEvent);
							}.bind(this)
						}).addStyleClass("cl_inputField")
					]
				}).addStyleClass("sapUiSmallMarginBegin"));
			} else if (iSelectedIndex === 1) { // Master wise
				oVBox.addItem(new sap.m.HBox({
					alignItems: "Center",
					justifyContent: "Start",
					items: [
						new sap.m.Text({
							text: "Master",
							width: "100px"
						}).addStyleClass("cl_inputLabel sapUiSmallMarginEnd"),

						new sap.m.Input({
							id: "WID_MASTER",
							showValueHelp: true,
							valueHelpOnly: true,
							valueHelpRequest: function(oEvent) {
								this.fnGetMasterMassAgent(oEvent);
							}.bind(this)
						}).addStyleClass("cl_inputField")
					]
				}).addStyleClass("sapUiSmallMarginBegin"));

				// Old Agent
				oVBox.addItem(new sap.m.HBox({
					alignItems: "Center",
					justifyContent: "Start",
					items: [
						new sap.m.Text({
							text: "Old Agent",
							width: "100px"
						}).addStyleClass("cl_inputLabel sapUiSmallMarginEnd"),
						new sap.m.Input({
							showValueHelp: true,
							valueHelpOnly: true,
							valueHelpRequest: function(oEvent) {
								this._oF4SourceInput = oEvent.getSource();
								this.fngetmassaddAgents(oEvent);
							}.bind(this)
						}).addStyleClass("cl_inputField")
					]
				}).addStyleClass("sapUiSmallMarginBegin"));

				// New Agent
				oVBox.addItem(new sap.m.HBox({
					alignItems: "Center",
					justifyContent: "Start",
					items: [
						new sap.m.Text({
							text: "New Agent",
							width: "100px"
						}).addStyleClass("cl_inputLabel sapUiSmallMarginEnd"),
						new sap.m.Input({
							showValueHelp: true,
							valueHelpOnly: true,
							valueHelpRequest: function(oEvent) {
								this._oF4SourceInput = oEvent.getSource();
								this.fngetmassaddAgents(oEvent);
							}.bind(this)
						}).addStyleClass("cl_inputField")
					]
				}).addStyleClass("sapUiSmallMarginBegin"));
			}
		},

		fnsubmitMassAgentChange: function() {
			var oVBox = sap.ui.core.Fragment.byId("massagentid", "dynamicAgentBox");
			var aInputs = oVBox.findAggregatedObjects(true, function(oControl) {
				return oControl instanceof sap.m.Input;
			});

			if (!aInputs || aInputs.length < 2) {
				ErrorHandler.showCustomSnackbar("Please fill in all required fields.", "Error", this);
				sap.m.MessageToast.show();
				return;
			}

			var oSelect = sap.ui.core.Fragment.byId("massagentid", "ID_MassAgent");
			var iSelectedIndex = oSelect.getSelectedIndex();

			var sOldAgent = "",
				sNewAgent = "",
				sMaster = "",
				aNavItems = [],
				oPayload = {};

			var getAgentName = this.getAgentNameById.bind(this);

			if (iSelectedIndex === 2) {
				// Overall
				sOldAgent = aInputs[0].getValue().trim();
				sNewAgent = aInputs[1].getValue().trim();

				if (!sOldAgent || !sNewAgent) {
					ErrorHandler.showCustomSnackbar("Please fill in all required fields.", "Error", this);
					return;
				}

				if (sOldAgent === sNewAgent) {
					ErrorHandler.showCustomSnackbar("Old Agent and New Agent cannot be the same.", "Error", this);
					return;
				}

				aNavItems = [{
					"OldAgent": sOldAgent,
					"NewAgent": sNewAgent,
					"OldName": getAgentName(sOldAgent),
					"NewName": getAgentName(sNewAgent),
					"AppId": "",
					"Flag": ""
				}];

			} else if (iSelectedIndex === 0) {
				// Application-wise
				var oMultiInput = aInputs[0];
				var aTokens = oMultiInput.getTokens();
				if (aTokens.length === 0) {
					ErrorHandler.showCustomSnackbar("Please select at least one App ID.", "Error", this);
					return;
				}
				sOldAgent = aInputs[1].getValue().trim();
				sNewAgent = aInputs[2].getValue().trim();
				if (!sOldAgent || !sNewAgent) {
					ErrorHandler.showCustomSnackbar("Please fill in both agents.", "Error", this);
					return;
				}
				if (sOldAgent === sNewAgent) {
					ErrorHandler.showCustomSnackbar("Old Agent and New Agent cannot be the same.", "Error", this);
					return;
				}

				aNavItems = aTokens.map(function(oToken) {
					var sRawValue = oToken.getKey() || oToken.getText();
					var sAppId = sRawValue.split("-")[0].trim();
					return {
						"OldAgent": sOldAgent,
						"NewAgent": sNewAgent,
						"OldName": getAgentName(sOldAgent),
						"NewName": getAgentName(sNewAgent),
						"AppId": sAppId,
						"Flag": ""
					};
				});

			} else if (iSelectedIndex === 1) {
				// Master-wise
				if (aInputs.length < 3) {
					ErrorHandler.showCustomSnackbar("Please fill in Master and both agents.", "Error", this);
					return;
				}
				sMaster = aInputs[0].getValue().split("-")[0].trim();
				sOldAgent = aInputs[1].getValue().trim();
				sNewAgent = aInputs[2].getValue().trim();
				if (!sMaster || !sOldAgent || !sNewAgent) {
					ErrorHandler.showCustomSnackbar("Master and agents are required.", "Error", this);
					return;
				}
				if (sOldAgent === sNewAgent) {
					ErrorHandler.showCustomSnackbar("Old Agent and New Agent cannot be the same.", "Error", this);
					return;
				}
				aNavItems = [{
					"OldAgent": sOldAgent,
					"NewAgent": sNewAgent,
					"OldName": getAgentName(sOldAgent),
					"NewName": getAgentName(sNewAgent),
					"AppId": "",
					"Master": sMaster,
					"Flag": ""
				}];
			}

			oPayload = {
				"Navwf_mass_agent_change": aNavItems
			};

			var that = this;
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			oModel.create("/wf_mass_agent_changeSet", oPayload, {
				success: function(oData) {
					var vFlag = oData.Navwf_mass_agent_change.results[0].Flag;
					if(vFlag === "E"){
						ErrorHandler.showCustomSnackbar("Error in Mass Agent Change save process.", "Error", this);
						return;
					}
					ErrorHandler.showCustomSnackbar("Mass Agent Change successful.", "success", this);
					that.fnCancelMassAgentChange();
					that.fnSaveGdBehaviour();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		getAgentNameById: function(sAgentId) {
			var oModel = this.getView().getModel("JM_Agents");
			var aAgents = oModel.getProperty("/List") || [];

			for (var i = 0; i < aAgents.length; i++) {
				if (aAgents[i].Value1 === sAgentId) {
					return aAgents[i].Value2; // Agent Name
				}
			}
			return "";
		},

		fnCancelMassAgentChange: function() {
			if (this.MassAgentfrag) {
				this.MassAgentfrag.close();
				this.MassAgentfrag.destroy();
				this.MassAgentfrag = null;
			}
		},

		// *--------------------------------------------------------------------------------------
		//			Common function logic to get the F4 data from the backend and bind model
		// *--------------------------------------------------------------------------------------

		bindTextF4model: function(opayload, oEvent) {
			var oJsonModel;
			var vTitle;
			var oLabels = {};
			var vLength;
			var aFormattedRows = [];
			var omodel1 = this.getOwnerComponent().getModel("JMConfig");

			if (opayload.FieldId === "KID_PM") {
				this._frontEndF4HandlingPM(oEvent);
				return;
			}
			if (opayload.FieldId === "KID_MG") {
				this._frontEndF4HandlingMG(oEvent);
				return;
			}
			busyDialog.open();
			omodel1.create("/SearchHelpSet", opayload, {
				success: function(odata) {
					if (odata.MsgType === "E") {
						ErrorHandler.showCustomSnackbar(odata.Message, "Error", this);
						busyDialog.close();
						return;
					}
					var aResults = odata.NavSerchResult.results;
					if (aResults.length > 0) {
						var oFirst = aResults[0];
						if (oFirst && (oFirst.DomvalueL || oFirst.Ddtext)) {
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", this);
								return;
							}
							if (this.selectedField && this.selectedField === "WID_APPID") {
								aResults = aResults.filter(function(item) {
									return item.DomvalueL !== "ALL";
								});
							}
							vLength = aResults.length;
							oLabels.col1 = "Key";
							if (oFirst.Label2) oLabels.col2 = oFirst.Label2;
							aResults.forEach(function(item) {
								var row = {};
								if (oLabels.col1) row.col1 = item.DomvalueL;
								if (oLabels.col2) row.col2 = item.Ddtext;
								if (oLabels.col3) row.col3 = item.DomvalueL3;
								if (oLabels.col4) row.col4 = item.DomvalueL4;
								aFormattedRows.push(row);
							});
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							this.getView().setModel(oJsonModel, "JM_F4Model");
							var textValue = this.getView().byId(this.selectedField + "_TXT");
							if (textValue) {
								vTitle = textValue.getText() + " (" + vLength + ")";
							} else {
								vTitle = "Application Master";
							}

							this.fnF4fragopen(oEvent, vTitle).open();
						} else {
							vLength = odata.NavSerchResult.results.length;
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", this);
								return;
							}
							if (oFirst.Label1) oLabels.col1 = oFirst.Label1;
							if (oFirst.Label2) oLabels.col2 = oFirst.Label2;
							if (oFirst.Label3) oLabels.col3 = oFirst.Label3;
							if (oFirst.Label4) oLabels.col4 = oFirst.Label4;

							if (this.selectedField === "ID_RECI_VAGRP") {
								aResults
									.filter(function(item) {
										return item.Value3 === this.getView().getModel("JM_KeydataModel").getProperty("/Werks");
									})
									.forEach(function(item) {
										var row = {};
										row.col1 = item.Value1;
										if (oLabels.col2) row.col2 = item.Value2;
										if (oLabels.col3) row.col3 = item.Value3;
										if (oLabels.col4) row.col4 = item.Value4;
										aFormattedRows.push(row);
									});
							} else {
								aResults.forEach(function(item) {
									var row = {};
									if (oLabels.col1 === "Material") {
										row.col1 = item.Value1 ? item.Value1.replace(/^0+/, "") : item.Value1;
									} else {
										row.col1 = item.Value1;
									}
									if (oLabels.col2) row.col2 = item.Value2;
									if (oLabels.col3) row.col3 = item.Value3;
									if (oLabels.col4) row.col4 = item.Value4;
									aFormattedRows.push(row);
								});
							}
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							this.getView().setModel(oJsonModel, "JM_F4Model");
							this.getView().getModel("JM_F4Model");
							if (this.agentFieldFlag) {
								var jsonList = {
									List: aResults
								};
								var oJsonList = new sap.ui.model.json.JSONModel();
								oJsonList.setData(jsonList);
								this.getView().setModel(oJsonList, "JM_Agents");
							}
							vTitle = this.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
							this.fnF4fragopen(oEvent, vTitle).open();
						}
					}
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		// *--------------------------------------------------------------------------------------
		//			customizing the F4 Model with stactic values to load to F4
		// *--------------------------------------------------------------------------------------
		fnCustomizeBindF4Model: function(Fieldid, oEvent) {
			var oJsonModel;
			var vTitle;
			var oLabels = {};
			var vLength;
			var aFormattedRows = [];
			this._oSelectedFieldId = oEvent.getSource();
			var val = Fieldid.substring(0, 3);
			if (!this.valueHelpfrag) {
				this.valueHelpfrag = sap.ui.xmlfragment("WorkflowRules.fragment.ValueHelp", this);
				this.getView().addDependent(this.valueHelpfrag);
			}
			if (val === "MMX") {
				var oPayload = {
					F4Type: "F",
					FieldId: Fieldid,
					Process: "M"
				};
			} else {
				oPayload = {
					F4Type: "P",
					FieldId: Fieldid,
					Process: "K"
				};
			}
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			oPayload.NavSerchResult = [];
			oModel.create("/SearchHelpSet", oPayload, {
				success: function(odata) {
					if (odata.MsgType === "E") {
						ErrorHandler.showCustomSnackbar(odata.Message, "Error", this);
						return;
					}
					var aResults = odata.NavSerchResult.results;
					if (aResults.length > 0) {
						var oFirst = aResults[0];
						if (oFirst && (oFirst.DomvalueL || oFirst.Ddtext)) {
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", this);
								return;
							}
							vLength = aResults.length;
							oLabels.col1 = "Key";
							if (oFirst.Label2) oLabels.col2 = oFirst.Label2;
							aResults.forEach(function(item) {
								var row = {};
								if (oLabels.col1) row.col1 = item.DomvalueL;
								if (oLabels.col2) row.col2 = item.Ddtext;
								aFormattedRows.push(row);
							});
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							this.getView().setModel(oJsonModel, "JM_F4Model");
							var textValue = this.getView().byId(this.selectedField + "_TXT");
							if (textValue) {
								vTitle = textValue.getText() + " (" + vLength + ")";
							} else {
								vTitle = "Application Master";
							}
							this.fnF4fragopen(oEvent, vTitle).open();
						} else {
							vLength = odata.NavSerchResult.results.length;
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", this);
								return;
							}
							if (oFirst.Label1) oLabels.col1 = oFirst.Label1;
							if (oFirst.Label2) oLabels.col2 = oFirst.Label2;
							if (oFirst.Label3) oLabels.col3 = oFirst.Label3;
							if (oFirst.Label4) oLabels.col4 = oFirst.Label4;
							aResults.forEach(function(item) {
								var row = {};
								row.col1 = item.Value1;
								if (oLabels.col2) row.col2 = item.Value2;
								if (oLabels.col3) row.col3 = item.Value3;
								if (oLabels.col4) row.col4 = item.Value4;
								aFormattedRows.push(row);
							});

							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							this.getView().setModel(oJsonModel, "JM_F4Model");
							this.getView().getModel("JM_F4Model");
							var label1 = odata.NavSerchResult.results.length > 0 ? odata.NavSerchResult.results[0].Label1 : "";
							var jsonList = {
								Label1: label1,
								List: odata.NavSerchResult.results
							};
							var oJsonList = new sap.ui.model.json.JSONModel();
							oJsonList.setData(jsonList);
							this.getView().setModel(oJsonList, "JM_VALUEHELP");

							vTitle = this.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
							this.fnF4fragopen(oEvent, vTitle).open();
						}
					}
					busyDialog.close();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		_frontEndF4HandlingMG: function(oEvent) {
			var aFormattedRows = [];
			var oLabels = {};
			var oJsonModel;

			oLabels.col1 = "Key";
			oLabels.col2 = "Description";
			aFormattedRows.push({
				col1: "",
				col2: ""
			});
			aFormattedRows.push({
				col1: "MG",
				col2: "Material Group"
			});
			oJsonModel = new sap.ui.model.json.JSONModel({
				labels: oLabels,
				rows: aFormattedRows
			});
			this.getView().setModel(oJsonModel, "JM_F4Model");
			var vLength = aFormattedRows.length;
			var vTitle = "Workflow Key" + " (" + vLength + ")";
			this.fnF4fragopen(oEvent, vTitle).open();
		},

		_frontEndF4HandlingPM: function(oEvent) {
			var aFormattedRows = [];
			var oLabels = {};
			var oJsonModel;

			oLabels.col1 = "Key";
			oLabels.col2 = "Description";
			aFormattedRows.push({
				col1: "",
				col2: ""
			});
			aFormattedRows.push({
				col1: "PM",
				col2: "Package Material Group"
			});
			oJsonModel = new sap.ui.model.json.JSONModel({
				labels: oLabels,
				rows: aFormattedRows
			});
			this.getView().setModel(oJsonModel, "JM_F4Model");
			var vLength = aFormattedRows.length;
			var vTitle = "Workflow Key" + " (" + vLength + ")";
			this.fnF4fragopen(oEvent, vTitle).open();
		},

		// *--------------------------------------------------------------------------------------
		//			Function to add line item in the general level and definitation table
		// *--------------------------------------------------------------------------------------
		onAddGDRow: function() {
			var oLastRow;
			// Safe emptiness check
			function isEmptyField(val) {
				return val === undefined || val === null || (typeof val === "string" && val.trim() === "");
			}
			if (!this._bAddEnabled) {
				return;
			}
			this.byId("id_Copy").setEnabled(false);
			var oModel = this.getView().getModel("GDTableModel");
			var aData = oModel.getProperty("/GDTableData") || [];
			if (aData.length > 0) {
				oLastRow = aData[aData.length - 1];
				if (oLastRow.isNew) {
					ErrorHandler.showCustomSnackbar("Please save the current row before adding a new one", "Information");
					return;
				}
			}
			if (aData.length > 0) {
				oLastRow = aData[aData.length - 1];
				var oWFParmModel = this.getView().getModel("jm_wfparm");
				var aGDProps = (oWFParmModel && oWFParmModel.getProperty("/GDFieldValueProps")) || ["WfParm1"];

				var bMissingField = aGDProps.some(function(prop) {
					var val = oLastRow[prop];
					return isEmptyField(val);
				});

				if (bMissingField) {
					ErrorHandler.showCustomSnackbar("Please complete the previous row before adding a new one", "Information");
					return;
				}
				var aLDLevels = (oLastRow.Navleveldef && oLastRow.Navleveldef.results) || [];

				var bHasAtLeastOneLevelBeyondL0 = aLDLevels.some(function(level) {
					return level.Lvl !== "L0";
				});
				if (!bHasAtLeastOneLevelBeyondL0) {
					ErrorHandler.showCustomSnackbar("Please add at least one more level in the previous row", "Information", this);
					return;
				}
				var aAgents = (oLastRow.Navagentassign && oLastRow.Navagentassign.results) || [];
				var bHasAgentAssigned = aAgents.some(function(agent) {
					return agent.Agent && agent.Agent.trim() !== "";
				});
				if (!bHasAgentAssigned) {
					ErrorHandler.showCustomSnackbar("Please assign at least one Agent in the previous row", "Information", this);
					return;
				}
			}

			var oNewRow = {
				WfParm1: "",
				WfParm2: "",
				WfParm3: "",
				WfParm4: "",
				isNew: true
			};
			aData.push(oNewRow);
			oModel.setProperty("/GDTableData", aData);
			this._oSelectedWFMainRow = oNewRow;

			this.getView().getModel("viewModel").setProperty("/isEditable", true);
			var oTable = this.byId("id_ResultTable");
			oTable.setVisibleRowCount(10);
			var iNewIndex = aData.length - 1;

			setTimeout(function() {
				oTable.setSelectedIndex(iNewIndex);
			}, 100);
			this._bSkipLDLoad = true;
			var oLDModel = this.getView().getModel("LDTableModel");
			if (!oLDModel) {
				oLDModel = new sap.ui.model.json.JSONModel();
				this.getView().setModel(oLDModel, "LDTableModel");
			}

			var oLDRow = {
				Lvl: "L0",
				MaxRole: "1",
				MinAppr: "1",
				TypeLvl: "Initiator",
				Type: "Sequential",
				Dept: "",
				isNew: true
			};
			oNewRow.Navleveldef = {
				results: [oLDRow]
			};
			oLDModel.setProperty("/tableDataNew", [oLDRow]);
			oLDModel.refresh(true);
			this.byId("id_LDTable").getBinding("rows").refresh(true);
			var oLDTable = this.byId("id_LDTable");

			setTimeout(function() {
				oLDTable.setSelectedIndex(0);
				this.onLDRowSelectionChange();
			}.bind(this), 200);
			var oAAAgents = [];
			if (this._oSelectedWFMainRow && this._oSelectedWFMainRow.Navagentassign && this._oSelectedWFMainRow.Navagentassign.results) {
				oAAAgents = this._oSelectedWFMainRow.Navagentassign.results;
			}

			var aFilteredAgents = oAAAgents.filter(function(agent) {
				return agent.Lvl === "L0";
			}).map(function(agent) {
				return Object.assign({}, agent, {
					LvlFromLD: "L0"
				});
			});

			aFilteredAgents.forEach(function(agent) {
				if (agent.StartDate && typeof agent.StartDate === "string") {
					// Expecting DD.MM.YYYY
					var parts = agent.StartDate.split(".");
					if (parts.length === 3) {
						var day = parseInt(parts[0], 10);
						var month = parseInt(parts[1], 10) - 1;
						var year = parseInt(parts[2], 10);
						var oDate = new Date(year, month, day);
						// FINAL safety check
						if (!isNaN(oDate.getTime())) {
							agent._StartDateObj = oDate;
						} else {
							agent._StartDateObj = null;
						}
					} else {
						agent._StartDateObj = null;
					}
				} else {
					agent._StartDateObj = null;
				}
			});

			var oAAModel = new sap.ui.model.json.JSONModel({
				tableDataAA: aFilteredAgents
			});
			this.getView().setModel(oAAModel, "AATableModel");
			var aRows = oTable.getBinding("rows").getContexts();

			setTimeout(function() {
				this._bSkipLDLoad = false;
			}.bind(this), 300);

			if (aRows.length > 0) {
				oTable.setFirstVisibleRow(aRows.length - 1);
			}
		},

		onAddLDRow: function() {
			if (!this._bAddEnabledLD) {
				return;
			}
			this._bIsAddingLDRow = true;
			var oView = this.getView();
			var oTable = oView.byId("id_LDTable");

			var oModel = oView.getModel("LDTableModel");
			var aRows = oModel.getProperty("/tableDataNew") || [];

			var oGDTableModel = this.getView().getModel("GDTableModel");
			var aData = oGDTableModel.getProperty("/GDTableData") || [];

			if (aData.length === 0) return;

			var oLastRow = aData[aData.length - 1];

			var oWFParmModel = this.getView().getModel("jm_wfparm");
			var aGDProps = (oWFParmModel && oWFParmModel.getProperty("/GDFieldValueProps")) || ["WfParm1"];

			// Safe emptiness check
			function isEmptyField(val) {
				return val === undefined || val === null || (typeof val === "string" && val.trim() === "");
			}

			var bMissingField = aGDProps.some(function(prop) {
				var val = oLastRow[prop];
				return isEmptyField(val);
			});

			if (bMissingField) {
				ErrorHandler.showCustomSnackbar("Please complete the previous row before adding a new one", "Information", this);
				return;
			}

			if (aRows.length > 0) {
				var oLast = aRows[aRows.length - 1];
				if (!oLast.Lvl || !oLast.TypeLvl) {
					ErrorHandler.showCustomSnackbar("Please fill the previous row completely before adding a new row", "Information", this);
					return;
				}
			}

			var maxLevel = -1;
			aRows.forEach(function(row) {
				if (row.Lvl && row.Lvl.startsWith("L")) {
					var iNum = parseInt(row.Lvl.substring(1));
					if (!isNaN(iNum) && iNum > maxLevel) {
						maxLevel = iNum;
					}
				}
			});

			var sNextLvl = "L" + (maxLevel + 1);
			aRows.forEach(function(row) {
				row.isRowEditable = false;
			});
			// Create a new row
			var oNewRow = {
				Lvl: sNextLvl,
				TypeLvl: "",
				MaxRole: "",
				MinAppr: "",
				Dept: "",
				Type: "Parallel",
				isNew: true,
				isRowEditable: true

			};

			// Add to model
			aRows.push(oNewRow);
			oModel.setProperty("/tableDataNew", aRows);
			oModel.refresh(true);
			if (!oLastRow.Navleveldef) {
				oLastRow.Navleveldef = {
					results: []
				};
			}
			if (!oLastRow.Navleveldef) {
				oLastRow.Navleveldef = {
					results: []
				};
			}
			oLastRow.Navleveldef.results = aRows;
			oGDTableModel.setProperty("/GDTableData", aData);
			setTimeout(function() {
				oTable.setFirstVisibleRow(aRows.length - 1);
				oTable.setSelectedIndex(aRows.length - 1);
			}, 100);
			this.byId("AddImage1").addStyleClass("cl_AddDelete");
			this._bAddEnabledLD = false;

		},

		onAddAARow: function() {
			if (!this._bAddEnabled) {
				return;
			}

			var oView = this.getView();
			var oTable = oView.byId("id_Agent");
			var oLDTable = oView.byId("id_LDTable");
			var oLDModel = oView.getModel("LDTableModel");
			var oModel = oView.getModel("AATableModel");

			var aAARows = oModel.getProperty("/tableDataAA") || [];
			var aLDRows = oLDModel.getProperty("/tableDataNew") || [];
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var bIsMassMaterial = sAppId.startsWith("MM") || sAppId.startsWith("RC") || sAppId.startsWith("BC") || sAppId.startsWith("PVMC") ||
				sAppId.startsWith("BX") || sAppId.startsWith("RX") || sAppId.startsWith("PHC") || sAppId.startsWith("PHX") || sAppId.startsWith(
					"PM") ||
				sAppId.startsWith("MG");
			if (aLDRows.length > 0) {
				var oLastLD = aLDRows[aLDRows.length - 1];
				if (!oLastLD.Lvl || !oLastLD.TypeLvl || !oLastLD.Type) {
					ErrorHandler.showCustomSnackbar("Please fill the level definition compeletely before adding Agent.", "Warning", this);
					return;
				}

				if (oLastLD.Type === "Parallel" && (oLastLD.MinAppr === "")) {
					ErrorHandler.showCustomSnackbar("Please fill Min role for Paralled type before adding Agent", "Warning", this);
					return;
				}
			}

			var oToday = new Date();
			var sFormattedDate = String(oToday.getDate()).padStart(2, '0') + "." +
				String(oToday.getMonth() + 1).padStart(2, '0') + "." +
				oToday.getFullYear();

			var iLDIndex = oLDTable.getSelectedIndex();
			if (iLDIndex < 0) {
				return;
			}

			var oSelectedLDRow = oLDTable.getContextByIndex(iLDIndex).getObject();
			if (!oSelectedLDRow || oSelectedLDRow.Lvl === "L0") {
				ErrorHandler.showCustomSnackbar("Cannot add Agent for L0 level.", "Error", this);
				return;
			}

			if (aAARows.length > 0) {
				var oLastAA = aAARows[aAARows.length - 1];
				// if (!oLastAA.Variant || !oLastAA.Agent || !oLastAA.Name)
				if ((!bIsMassMaterial && (!oLastAA.Variant || oLastAA.Variant.trim() === "")) || !oLastAA.Agent || !oLastAA.Name) {
					ErrorHandler.showCustomSnackbar("Please complete the previous Agent row before adding a new one", "Warning", this);
					return;
				}
			}

			var sLvl = oSelectedLDRow.Lvl;
			var iMaxRole = parseInt(oSelectedLDRow.MaxRole || "0", 10);
			var iMinAppr = parseInt(oSelectedLDRow.MinAppr || "0", 10);

			var iCurrentCount = aAARows.filter(function(row) {
				return row.LvlFromLD === sLvl;
			}).length;

			var iFutureCount = iCurrentCount + 1;

			for (var i = 0; i < aLDRows.length; i++) {
				if (aLDRows[i].Lvl === sLvl) {
					if (iFutureCount > iMaxRole) {
						aLDRows[i].MaxRole = String(iFutureCount);
					}
					if (aLDRows[i].Type === "Sequential") {
						aLDRows[i].MinAppr = String(iFutureCount);
					}
					break;
				}
			}

			oLDModel.setProperty("/tableDataNew", aLDRows);
			oLDModel.refresh(true);

			var iRoleCount = aAARows.filter(function(row) {
				return row.LvlFromLD === sLvl;
			}).length;
			var bAllActive = aAARows
				.filter(function(row) {
					return row.LvlFromLD === sLvl;
				})
				.every(function(row) {
					return row.Active === true;
				});

			if (!bAllActive) {
				ErrorHandler.showCustomSnackbar("Please activate all existing Agent rows before adding a new one", "Information", this);
				return;
			}
			var oNewRow = {
				StartDate: sFormattedDate,
				EndDate: new Date(9999, 11, 31),
				Agent: "",
				Name: "",
				Active: true,
				Variant: "",
				isNew: true,
				LvlFromLD: sLvl,

				Role: String(iRoleCount + 1).padStart(2, '0')
			};

			aAARows.push(oNewRow);
			oModel.setProperty("/tableDataAA", aAARows);
			oModel.refresh(true);

			if (!oSelectedLDRow.Navagentassign) {
				oSelectedLDRow.Navagentassign = {
					results: []
				};
			}

			oSelectedLDRow.Navagentassign.results = aAARows.filter(function(row) {
				return row.LvlFromLD === sLvl;
			});

			aLDRows[iLDIndex] = oSelectedLDRow;
			oLDModel.setProperty("/tableDataNew", aLDRows);
			oLDModel.refresh(true);

			if (oSelectedLDRow.Type === "Parallel" || oSelectedLDRow.Type === "Sequential") {
				this._bAddEnabledLD = false;

				var oAddImage = oView.byId("AddImage1");
				if (oAddImage) {
					oAddImage.addStyleClass("cl_AddDelete");
				}
			}

			setTimeout(function() {
				oTable.setFirstVisibleRow(aAARows.length - 1);
				oTable.setSelectedIndex(aAARows.length - 1);
			}, 100);
		},

		// *--------------------------------------------------------------------------------------
		//			Function to delete line item in the general level and definitation table
		// *--------------------------------------------------------------------------------------

		ondeleteAA: function() {
			if (!this._bAddEnabled) {
				return;
			}
			if (!this.fnvalidateDeleteAA()) {
				return;
			}
			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you sure you want to delete?",
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "AgentDelete"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},

		onDeleteSelectedRowsAA: function() {
			if (!this._bAddEnabled) {
				return;
			}

			var oView = this.getView();
			var oTable = this.byId("id_Agent");
			var gtable = this.byId("id_ResultTable");
			var iSelectedIndex = gtable.getSelectedIndex();
			var oModel = oView.getModel("AATableModel");
			var aData = oModel.getProperty("/tableDataAA");
			var oLDTable = oView.byId("id_LDTable");
			var oLDModel = oView.getModel("LDTableModel");
			var aLDRows = oLDModel.getProperty("/tableDataNew") || [];
			var aSelectedIndices = oTable.getSelectedIndices();
			var iLDIndex = oLDTable.getSelectedIndex();
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var iSelectedLevelIndex = this.byId("id_LDTable").getSelectedIndex();
			var iSelectedAgentIndex = this.byId("id_Agent").getSelectedIndex();
			if (iLDIndex >= 0) {
				var oSelectedLDRow = oLDTable.getContextByIndex(iLDIndex).getObject();
				if (oSelectedLDRow.Lvl === "L0") {
					ErrorHandler.showCustomSnackbar("Cannot Delete Agent for L0 Level", "Warning", this);
					return;
				}
			}

			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar("Please select at least one row to delete", "Information", this);
				return;
			}

			function convertType(t) {
				if (t === "Parallel") return "P";
				if (t === "Sequential") return "S";
				return t;
			}

			function convertTypeLvl(a) {
				if (a === "Initiator") return "I";
				if (a === "Reviewer") return "R";
				if (a === "Approver") return "A";
				return a;
			}

			function convertUIDateToBackend(oDateInput) {
				if (!oDateInput) return null;
				if (oDateInput instanceof Date && !isNaN(oDateInput.getTime())) {
					return new Date(Date.UTC(
						oDateInput.getFullYear(),
						oDateInput.getMonth(),
						oDateInput.getDate()
					)).toISOString().slice(0, 19);
				}
				if (typeof oDateInput === "string") {
					var parts = oDateInput.split(".");
					if (parts.length === 3) {
						var day = parseInt(parts[0], 10);
						var month = parseInt(parts[1], 10) - 1;
						var year = parseInt(parts[2], 10);
						var dateObj = new Date(Date.UTC(year, month, day));
						if (!isNaN(dateObj.getTime())) {
							return dateObj.toISOString().slice(0, 19);
						}
					}
				}
				return null;
			}

			var aDeletedAgents = [];
			var aNewOnlyIndices = [];

			aSelectedIndices.forEach(function(iIndex) {
				var oAgentRow = aData[iIndex];

				// Assume new rows do not have Agent field or have a flag 'isNew'
				if (!oAgentRow.Agent || oAgentRow.isNew) {
					aNewOnlyIndices.push(iIndex);
				} else {
					aDeletedAgents.push({
						AppId: sAppId,
						Variant: oAgentRow.Variant || "",
						WfParm1: oAgentRow.WfParm1 || "",
						WfParm2: oAgentRow.WfParm2 || "",
						WfParm3: oAgentRow.WfParm3 || "",
						WfParm4: oAgentRow.WfParm4 || "",
						Lvl: oAgentRow.LvlFromLD || "",
						Role: String(oAgentRow.Role).padStart(2, '0'),
						Agent: "",
						StartDate: convertUIDateToBackend(oAgentRow.StartDate),
						EndDate: convertUIDateToBackend(oAgentRow.EndDate),
						Name: "",
						MailId: "",
						Active: true
					});
				}
			});

			var that = this;
			var removeFromData = function() {
				var aFilteredData = aData.filter(function(oRow, iIndex) {
					return !aSelectedIndices.includes(iIndex);
				});

				// Remove from LD row's Navagentassign to prevent reappearing
				if (oSelectedLDRow && oSelectedLDRow.Navagentassign && oSelectedLDRow.Navagentassign.results) {
					oSelectedLDRow.Navagentassign.results = oSelectedLDRow.Navagentassign.results.filter(function(oRow, iIndex) {
						return !aSelectedIndices.includes(iIndex);
					});
				}

				// Update MaxRole/MinAppr if needed
				if (oSelectedLDRow) {
					var sLvl = oSelectedLDRow.Lvl;
					var sType = oSelectedLDRow.Type;
					var iRemainingCount = aFilteredData.filter(function(row) {
						return row.LvlFromLD === sLvl;
					}).length;

					for (var i = 0; i < aLDRows.length; i++) {
						if (aLDRows[i].Lvl === sLvl) {
							aLDRows[i].MaxRole = String(iRemainingCount);
							if (sType === "Sequential") {
								aLDRows[i].MinAppr = String(iRemainingCount);
							}
							break;
						}
					}
					oLDModel.setProperty("/tableDataNew", aLDRows);
					oLDModel.refresh(true);
				}

				oModel.setProperty("/tableDataAA", aFilteredData);
				oModel.refresh(true);
				oTable.clearSelection();

				if (that.DeleteAAfrag) {
					that.DeleteAAfrag.close();
					that.DeleteAAfrag.destroy();
					that.DeleteAAfrag = null;
				}
				that._checkMinApprCompletion();
			};

			if (aDeletedAgents.length > 0) {
				var aLevelDefs = [];
				if (oSelectedLDRow) {

					var aFilteredData = aData.filter(function(oRow, iIndex) {
						return !aSelectedIndices.includes(iIndex);
					});
					var sLvl = oSelectedLDRow.Lvl;
					var sType = oSelectedLDRow.Type;
					var iRemainingCount = aFilteredData.filter(function(row) {
						return row.LvlFromLD === sLvl;
					}).length;

					for (var i = 0; i < aLDRows.length; i++) {
						if (aLDRows[i].Lvl === sLvl) {
							aLDRows[i].MaxRole = String(iRemainingCount);
							if (sType === "Sequential") {
								aLDRows[i].MinAppr = String(iRemainingCount);
							}
							break;
						}
					}
					oLDModel.setProperty("/tableDataNew", aLDRows);
					oLDModel.refresh(true);

					//  updated MaxRole/MinAppr for payload
					aLevelDefs.push({
						Dept: oSelectedLDRow.Dept || "",
						AppId: sAppId,
						WfParm1: oSelectedLDRow.WfParm1 || "",
						WfParm2: oSelectedLDRow.WfParm2 || "",
						WfParm3: oSelectedLDRow.WfParm3 || "",
						WfParm4: oSelectedLDRow.WfParm4 || "",
						TypeLvl: convertTypeLvl(oSelectedLDRow.TypeLvl) || "",
						Lvl: sLvl,
						MaxRole: String(iRemainingCount).padStart(2, '0'),
						MinAppr: (sType === "Sequential" ? String(iRemainingCount) : String(oSelectedLDRow.MinAppr)).padStart(2, '0'),
						Type: convertType(sType) || ""
					});
				}
				var oPayload = {
					AppId: aDeletedAgents[0].AppId,
					WfParm1: aDeletedAgents[0].WfParm1,
					WfParm2: aDeletedAgents[0].WfParm2,
					WfParm3: "",
					WfParm4: "",
					Flag: "D",
					Navleveldef: [],
					Navagentassign: aDeletedAgents
				};
				this._iPrevLevelIndex = iSelectedLevelIndex;
				this._iPrevAgentIndex = iSelectedAgentIndex;

				this.getOwnerComponent().getModel("JMConfig").create("/WFMainSet", oPayload, {
					success: function() {
						ErrorHandler.showCustomSnackbar("Agent deleted successfully.", "success", this);

						that.fnrestoreSavedLevelSelection(iSelectedIndex);
						if (that.DeleteAAfrag) {
							that.DeleteAAfrag.close();
							that.DeleteAAfrag.destroy();
							that.DeleteAAfrag = null;
						}
					}.bind(this),
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}
				});
			} else {
				// Only unsaved rows selected
				removeFromData();
				ErrorHandler.showCustomSnackbar(" Agent removed.", "Error", this);

			}
		},

		ondeleteLD: function() {
			if (!this._bAddEnabled) {
				return;
			}
			if (!this.fnvalidateDeleteLD()) {
				return;
			}
			var oTable = this.byId("id_LDTable");
			var oLDModel = this.getView().getModel("LDTableModel");
			var aData = oLDModel.getProperty("/tableDataNew") || [];
			var aSelectedIndices = oTable.getSelectedIndices();

			var bHasSaved = false;
			var bHasUnsaved = false;

			aSelectedIndices.forEach(function(iIndex) {
				var oRow = aData[iIndex];
				if (oRow && oRow.isNew) {
					bHasUnsaved = true;
				} else if (oRow) {
					bHasSaved = true;
				}
			});

			var sMsg = "Are you sure you want to delete the row?";
			if (bHasSaved) {
				sMsg = "Are you sure you want to delete the record?\nIt will be permanently deleted from SAP?";
			} else if (bHasUnsaved) {
				sMsg = "Are you sure you want to delete the row?";
			}

			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: sMsg,
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "LevelDelete"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},

		onDeleteSelectedRowsLD: function() {
			var that = this;
			var gtable = this.byId("id_ResultTable");
			var iSelectedIndex = gtable.getSelectedIndex();
			var oTable = this.byId("id_LDTable");
			var oLDModel = this.getView().getModel("LDTableModel");
			var oJMConfigModel = this.getOwnerComponent().getModel("JMConfig");

			var aData = oLDModel.getProperty("/tableDataNew") || [];
			var aSelectedIndices = oTable.getSelectedIndices();
			var aPayloadLevels = [];

			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar("Please select at least one row to delete", "Information", this);
				return;
			}
			var bHasL0 = aSelectedIndices.some(function(iIndex) {
				var oRow = aData[iIndex];
				return oRow && oRow.Lvl === "L0";
			});

			if (bHasL0) {
				ErrorHandler.showCustomSnackbar("Level L0 cannot be deleted", "Warning", this);
				if (this.DeleteLDfrag) {
					this.DeleteLDfrag.close();
					this.DeleteLDfrag.destroy();
					this.DeleteLDfrag = null;
				}
				return;
			}

			var bHasSaved = false;
			var bHasUnsaved = false;

			aSelectedIndices.forEach(function(iIndex) {
				var oRow = aData[iIndex];
				if (oRow && oRow.isNew) {
					bHasUnsaved = true;
				} else if (oRow) {
					bHasSaved = true;
				}
			});

			// Capture Lvl values of selected rows for payload
			for (var i = 0; i < aSelectedIndices.length; i++) {
				var iIndex = aSelectedIndices[i];
				var oRow = aData[iIndex];

				if (oRow && !oRow.isNew && oRow.Lvl) {
					aPayloadLevels.push(oRow.Lvl);
				}
			}

			// Construct payload for backend deletion
			if (aPayloadLevels.length > 0 && this._oSelectedWFMainRow) {
				var oMain = this._oSelectedWFMainRow;
				var oPayload = {
					AppId: oMain.AppId || "",
					WfParm1: oMain.WfParm1 || "",
					WfParm2: oMain.WfParm2 || "",
					WfParm3: oMain.WfParm3 || "",
					WfParm4: oMain.WfParm4 || "",
					Flag: "D",
					Navleveldef: [],
					Navagentassign: []
				};

				aPayloadLevels.forEach(function(sLvl) {
					oPayload.Navleveldef.push({
						AppId: oMain.AppId || "",
						WfParm1: oMain.WfParm1 || "",
						WfParm2: oMain.WfParm2 || "",
						WfParm3: oMain.WfParm3 || "",
						WfParm4: oMain.WfParm4 || "",
						Dept: "",
						TypeLvl: "",
						Lvl: sLvl,
						MaxRole: "",
						MinAppr: "",
						Type: ""
					});
				});

				// Call backend with payload
				oJMConfigModel.create("/WFMainSet", oPayload, {
					success: function() {
						ErrorHandler.showCustomSnackbar("Level Deleted Successfully", "success", this);
						that.fnrestoreSavedLevelSelection(iSelectedIndex);
						that._iSelectedLDIndex = undefined;

					},
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}
				});
			}

			var aNewData = [];
			var iLevelCounter = 0;
			aData.forEach(function(oRow, idx) {
				if (!aSelectedIndices.includes(idx)) {
					oRow.Lvl = "L" + iLevelCounter;
					aNewData.push(oRow);
					iLevelCounter++;
				}
			});

			oLDModel.setProperty("/tableDataNew", aNewData);

			// Reset table selection and update Add button
			var iMinSelected = Math.min.apply(null, aSelectedIndices);
			var iNewIndex = iMinSelected - 1 >= 0 ? iMinSelected - 1 : 0;
			this._iSelectedLDIndex = undefined;
			setTimeout(function() {
				if (aNewData.length > 0 && iNewIndex < aNewData.length) {
					oTable.setSelectedIndex(iNewIndex);
				}
			}, 0);

			var bAllRowsFilled = true;
			for (var i = 0; i < aNewData.length; i++) {
				var oRow = aNewData[i];
				if (!oRow.Lvl || !oRow.Type || !oRow.TypeLvl) {
					bAllRowsFilled = false;
					break;
				}
			}
			this._bAddEnabledLD = bAllRowsFilled;
			if (this._bAddEnabledLD) {

				this.byId("AddImage1").removeStyleClass("cl_AddDelete");
			}

			if (this.DeleteLDfrag) {
				this.DeleteLDfrag.close();
				this.DeleteLDfrag.destroy();
				this.DeleteLDfrag = null;
			}

		},

		ondelete: function() {
			if (!this._bAddEnabled) {
				return;
			}
			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you sure you want to delete?",
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "GeneralDelete"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
			// this.fn_delete_frag();

		},

		onDeleteWorkflowData: function() {
			var that = this;

			this.byId("id_Copy").setEnabled(true);
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var oLDModel = this.getView().getModel("LDTableModel");
			var gTable = this.byId("id_ResultTable");
			var aLDData = oLDModel.getProperty("/tableDataNew") || [];
			var aSelectedIndices = gTable.getSelectedIndices();

			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar("Please select at least one row to delete.", "Information", this);
				return;
			}

			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var oResultTable = this.byId("id_ResultTable");
			var iSelectedIndex = oResultTable.getSelectedIndex();

			if (iSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please select a row in the General Data table", "Information", this);
				return;
			}
			var oContext = oResultTable.getContextByIndex(iSelectedIndex);
			var oSelectedRow = oContext.getObject();

			var sWfParm1 = oSelectedRow.WfParm1 || "";
			var sWfParm2 = oSelectedRow.WfParm2 || "";
			var sWfParm3 = oSelectedRow.WfParm3 || "";
			var sWfParm4 = "";

			// Helper functions
			function convertActive(v) {
				return v === true || v === "True" || v === "X";
			}

			function convertType(t) {
				if (t === "Parallel") return "P";
				if (t === "Sequential") return "S";
				return t;
			}

			function convertTypeLvl(a) {
				if (a === "Initiator") return "I";
				if (a === "Reviewer") return "R";
				if (a === "Approver") return "A";
				return a;
			}

			var oPayload = {
				AppId: sAppId,
				WfParm1: sWfParm1,
				WfParm2: sWfParm2,
				WfParm3: sWfParm3,
				WfParm4: sWfParm4,
				Flag: "D",
				Navleveldef: [],
				Navagentassign: []
			};
			oModel.create("/WFMainSet", oPayload, {
				success: function() {
					ErrorHandler.showCustomSnackbar("Selected workflow deleted successfully", "success", that);
					var aRemaining = aLDData.filter(function(row, index) {
						return !aSelectedIndices.includes(index);
					});
					oLDModel.setProperty("/tableDataNew", aRemaining);

					// oTable.clearSelection();
					if (that.Deletefrag) {
						that.Deletefrag.close();
						that.Deletefrag.destroy();
						that.Deletefrag = null;
					}
					that.fnSaveGdBehaviour();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}
			});
		},

		// *--------------------------------------------------------------------------------------
		//			Function to validation the Level table and Agent table
		// *--------------------------------------------------------------------------------------
		fnvalidateDeleteLD: function() {
			var oView = this.getView();
			var oLDTable = oView.byId("id_LDTable");
			var oLDModel = oView.getModel("LDTableModel");
			var aLDData = oLDModel.getProperty("/tableDataNew") || [];

			var aSelectedIndices = oLDTable.getSelectedIndices();
			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar("Please select at least one Level to delete.", "Error", this);
				return false;
			}

			// Get selected rows
			var aSelectedRows = aSelectedIndices.map(function(iIndex) {
				return oLDTable.getContextByIndex(iIndex).getObject();
			});

			// Check if L0 is selected
			var bL0Selected = aSelectedRows.some(function(ld) {
				return ld.Lvl === "L0";
			});
			if (bL0Selected) {
				ErrorHandler.showCustomSnackbar("Cannot delete Level L0.", "Error", this);
				return false;
			}

			// Filter saved approvers (assume IsNew flag exists; reverse if using something like HasGuid)
			var aSavedApprovers = aLDData.filter(function(ld) {
				return ld.TypeLvl === "Approver" && !ld.isNew;
			});

			var aSelectedSavedApprovers = aSelectedRows.filter(function(ld) {
				return ld.TypeLvl === "Approver" && !ld.isNew;
			});

			if (aSavedApprovers.length === 1 && aSelectedSavedApprovers.length === 1) {
				ErrorHandler.showCustomSnackbar("At least one saved Approver level must be retained.", "Error", this);
				return false;
			}

			return true;
		},

		fnvalidateDeleteAA: function() {
			var oView = this.getView();
			var oTable = oView.byId("id_Agent");
			var oLDTable = oView.byId("id_LDTable");
			var oModel = oView.getModel("AATableModel");
			var oLDModel = oView.getModel("LDTableModel");

			var aData = oModel.getProperty("/tableDataAA") || [];
			var aLDData = oLDModel.getProperty("/tableDataNew") || [];
			var aSelectedIndices = oTable.getSelectedIndices();
			var iLDIndex = oLDTable.getSelectedIndex();

			if (iLDIndex < 0 || aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar("Please select a level and at least one agent to delete.", "Error", this);
				return false;
			}

			var oSelectedLDRow = oLDTable.getContextByIndex(iLDIndex).getObject();
			var sLvl = oSelectedLDRow.Lvl;
			var sType = oSelectedLDRow.Type;

			if (sLvl === "L0") {
				ErrorHandler.showCustomSnackbar("Cannot delete agent for L0 level.", "Error", this);
				return false;
			}

			var aAgentsInLevel = aData.filter(function(agent) {
				return agent.LvlFromLD === sLvl;
			});

			var iSelectedCount = aSelectedIndices.filter(function(iIndex) {
				return aData[iIndex].LvlFromLD === sLvl;
			}).length;

			var iRemaining = aAgentsInLevel.length - iSelectedCount;

			if (sType === "Parallel") {
				var iMinAppr = parseInt(oSelectedLDRow.MinAppr || "0", 10);
				if (iRemaining < iMinAppr) {
					ErrorHandler.showCustomSnackbar("Cannot delete agent(s). Level " + sLvl + " requires at least " + iMinAppr + " agents.", "Error",
						this);
					return false;
				}
			}

			if (sType === "Sequential") {
				if (iRemaining < 1) {
					ErrorHandler.showCustomSnackbar("Sequential level " + sLvl + " must have at least one agent.", "Error", this);
					return false;
				}
			}

			return true;
		},

		// *--------------------------------------------------------------------------------------
		//			When Change button press
		// *--------------------------------------------------------------------------------------
		onEditRow: function() {
			this.fnOpenChangeFragment();
		},

		fnOpenChangeFragment: function(oEvent) {
			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Do you want to edit the details?",
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "Edit"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},

		onConfirmYes: function() {
			this._bAddEnabled = true;
			this._bAddEnabledLD = true;
			this._bIsEditMode = true;
			this.onLDRowSelectionChange();
			this.emailflag = true;
			this.byId("id_LDTable").addStyleClass("cl_maxfield");
			this.byId("id_Agent").addStyleClass("cl_Agentfield");
			this.byId("id_Copy").setEnabled(true);
			this.byId("id_saveWf").setEnabled(true);
			this.byId("id_saveWf").removeStyleClass("cl_disablebtn");
			this.byId("AddImage").removeStyleClass("cl_AddDelete");
			this.byId("DelImage").removeStyleClass("cl_AddDelete");
			this.byId("AddImage1").removeStyleClass("cl_AddDelete");
			this.byId("DelImage1").removeStyleClass("cl_AddDelete");
			this.byId("AddImage2").removeStyleClass("cl_AddDelete");
			this.byId("DelImage2").removeStyleClass("cl_AddDelete");
			this.byId("id_change").setEnabled(false);
			this.byId("ID_AGENT_INPUT").addStyleClass("cl_chtabInput");
			this.getView().getModel("viewModel").setProperty("/isComboEditable", true);
			this.getView().getModel("viewModel").setProperty("/isEditable", true);
			var aParms = this.getView().getModel("JScreenParm").getProperty("/List") || [];

			if (aParms.length > 0) {
				var oParmRow = aParms[0];
				for (var i = 1; i <= 4; i++) {
					var sFieldId = oParmRow["WfParm" + i + "Id"];
					if (sFieldId) {
						var oInput = sap.ui.getCore().byId(sFieldId);
						if (oInput) {
							var sValue = oInput.getValue().trim();
							if (sValue !== "") {
								ValueEntered = true;
							}
						}
					}
				}
			}
		},

		// *--------------------------------------------------------------------------------------
		//			  When Area Column Select
		// *--------------------------------------------------------------------------------------
		onTypeLvlComboChange: function(oEvent) {
			var oComboBox = oEvent.getSource();
			var sEnteredText = oComboBox.getValue();
			var oContext = oComboBox.getBindingContext("LDTableModel");
			if (!oContext) return;

			var oModel = oContext.getModel(); // LDTableModel
			var aItems = oComboBox.getItems();
			var bValid = false;
			var sKeyFromText = "";

			// Try to match entered text with item text
			for (var i = 0; i < aItems.length; i++) {
				var oItem = aItems[i];
				if (oItem.getText() === sEnteredText) {
					bValid = true;
					sKeyFromText = oItem.getKey();
					break;
				}
			}

			if (!bValid) {
				// sap.m.MessageToast.show("Invalid value. Please select a valid Type Level.");
				ErrorHandler.showCustomSnackbar("Invalid value. Please select a valid Type Level.", "Error", this);
				oComboBox.setValue("");
				oModel.setProperty(oContext.getPath() + "/TypeLvl", "");
				return;
			}

			// Use key from matched text
			var sNewValue = sKeyFromText;

			var aRows = oModel.getProperty("/tableDataNew") || [];
			var iCurrentIndex = parseInt(oContext.getPath().split("/").pop(), 10);
			var bApproverSeen = false;

			for (var j = 0; j < aRows.length; j++) {
				var sTypeLvl = aRows[j].TypeLvl;

				if (j === iCurrentIndex) {
					sTypeLvl = sNewValue;
				}

				if (sTypeLvl === "Approver") {
					bApproverSeen = true;
				} else if (bApproverSeen && sTypeLvl === "Reviewer") {
					ErrorHandler.showCustomSnackbar("Reviewer cannot be added after an Approver", "Warning", this);

					// Revert input
					oComboBox.setSelectedKey("");
					oModel.setProperty(oContext.getPath() + "/TypeLvl", "");

					setTimeout(function() {
						oComboBox.setSelectedKey("");
					}, 10);
					return;
				}
			}

			oModel.setProperty(oContext.getPath() + "/TypeLvl", sNewValue);
			oComboBox.setSelectedKey(sNewValue);
		},

		// *--------------------------------------------------------------------------------------
		//			  Mass Agent Applicatioon Id Search Field logic
		// *--------------------------------------------------------------------------------------
		fnAppIdSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = [
				new sap.ui.model.Filter("DomvalueL", sap.ui.model.FilterOperator.Contains, sValue),
				new sap.ui.model.Filter("Ddtext", sap.ui.model.FilterOperator.Contains, sValue)
			];

			var oBinding = oEvent.getSource().getBinding("items");
			var oFinalFilter = new sap.ui.model.Filter(oFilter, false);
			oBinding.filter(oFinalFilter);

		},
		fnMassAppClose: function(oEvent) {
			var oDialog = oEvent.getSource();
			this.fn_clearSelectDialogFilters(oDialog);
			var aSelectedItems = oEvent.getParameter("selectedContexts");
			if (!aSelectedItems || aSelectedItems.length === 0) return;

			var oMultiInput = this._oF4SourceInput;
			oMultiInput.removeAllTokens();

			aSelectedItems.forEach(function(oContext) {
				var oData = oContext.getObject();
				var sText = oData.DomvalueL + " - " + oData.Ddtext;
				oMultiInput.addToken(new sap.m.Token({
					key: oData.DomvalueL,
					text: sText
				}));
			});
		},
		fn_clearSelectDialogFilters: function(oDialog) {
			if (oDialog && oDialog.getBinding("items")) {

				oDialog.getBinding("items").filter([]);
			}
			if (oDialog.setSearchFieldValue) {
				oDialog.setSearchFieldValue("");
			}
		},
		fnMatlTypef4Close: function(oEvent) {
			var oDialog = oEvent.getSource();
			this.fn_clearSelectDialogFilters(oDialog);
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (!oSelectedItem || !this._oF4SourceInput) return;

			var sValue1 = oSelectedItem.getBindingContext("F4HelpModelMaterial").getProperty("Value1");

			var oInput = this._oF4SourceInput;
			var oRowContext = oInput.getBindingContext("GDTableModel");

			if (oRowContext) {
				// Keep table row logic unchanged
				var oModel = this.getView().getModel("GDTableModel");
				var aData = oModel.getProperty("/GDTableData");
				if (!aData || !Array.isArray(aData)) return;

				var sPath = oRowContext.getPath();
				var iSelectedIndex = parseInt(sPath.split("/").pop());
				var oSelectedRow = aData[iSelectedIndex];

				var tempRow = Object.assign({}, oSelectedRow, {
					WfParm1: sValue1
				});

				var isDuplicate = false;
				for (var i = 0; i < aData.length; i++) {
					if (i !== iSelectedIndex) {
						var existingRow = aData[i];
						if (
							existingRow.WfParm1 === tempRow.WfParm1 &&
							existingRow.WfParm2 === tempRow.WfParm2 &&
							existingRow.WfParm3 === tempRow.WfParm3
						) {
							isDuplicate = true;
							break;
						}
					}
				}

				if (isDuplicate) {
					sap.m.MessageBox.error("Duplicate entry found. Please enter unique values.");
				} else {
					oModel.setProperty(sPath + "/WfParm1", sValue1);
					oInput.setValue(sValue1);
					oInput.fireChange({
						value: sValue1
					});
				}
			} else if (oInput.hasStyleClass("cl_gdInput")) {
				var oMassModel = this.getView().getModel("MassInputModel");
				var sWfParm1Old = oMassModel.getProperty("/WfParm1");
				var sWfParm1New = sValue1;

				// Compare only old vs. new
				if (sWfParm1Old === sWfParm1New) {
					ErrorHandler.showCustomSnackbar("Same as existing value. Please select a different one.", "Error", this);
					oInput.setValue(""); // Clear the input
				} else {
					oInput.setValue(sWfParm1New);
					oInput.fireChange({
						value: sWfParm1New
					});
				}
			} else {
				// Copy Dialog input case
				var oCopyModel = this.getView().getModel("copyModel");
				var oCreated = oCopyModel.getProperty("/created") || {};

				var sWfParm2 = oCreated.WfParm2;
				var sWfParm3 = oCreated.WfParm3;

				var oModel = this.getView().getModel("GDTableModel");
				var aData = oModel.getProperty("/GDTableData");

				var isDuplicate = aData.some(function(row) {
					return (
						row.WfParm1 === sValue1 &&
						row.WfParm2 === sWfParm2 &&
						row.WfParm3 === sWfParm3
					);
				});

				if (isDuplicate) {
					ErrorHandler.showCustomSnackbar("Duplicate entry already exists. Please select another one.", "Error", this);
				} else {
					oCopyModel.setProperty("/created/WfParm1", sValue1);
					oInput.setValue(sValue1);
					oInput.fireChange({
						value: sValue1
					});
				}
			}

			this._oF4SourceInput = null;
		},

		removeLeadingZeros: function(sValue) {
			if (!sValue || isNaN(sValue)) {
				return "";
			} else {
				return String(parseInt(sValue, 10));
			}
		},

		formatDate: function(oDate) {
			if (!oDate) {
				return "";
			}

			var dateObj = (oDate instanceof Date) ? oDate : new Date(oDate);

			if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
				return "";
			}

			var day = String(dateObj.getDate()).padStart(2, "0");
			var month = String(dateObj.getMonth() + 1).padStart(2, "0");
			var year = dateObj.getFullYear();

			return day + "." + month + "." + year;
		},

		formatValueHelpItem: function(oItem) {
			// oItem is the data context of one list item
			var val1 = oItem.Ddtext || oItem.Value1;
			var val2 = oItem.DomvalueL || oItem.Value2;
			return val1 && val2 ? val1 + " - " + val2 : (val1 || val2);
		}

	});

});