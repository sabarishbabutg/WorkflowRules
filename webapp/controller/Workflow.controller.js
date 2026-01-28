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

		onInit: function() {
			// ********************* IMAGE MODEL ************************
			var vPathImage = jQuery.sap.getModulePath("WorkflowRules") + "/Image/";
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: vPathImage
			});
			this.getView().setModel(oImageModel, "JM_ImageModel");

			// **********************************************************
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
			var oDeptData = {
				Departments: [{
					key: "PD",
					text: "PD"
				}, {
					key: "SCM",
					text: "SCM"
				}, {
					key: "Accounting",
					text: "Accounting"
				}, {
					key: "Costing",
					text: "Costing"
				}, {
					key: "Quality management",
					text: "Quality management"
				}, {
					key: "Plant",
					text: "Plant"
				}, {
					key: "taxation",
					text: "taxation"
				}]
			};

			var oDeptModel = new sap.ui.model.json.JSONModel(oDeptData);
			this.getView().setModel(oDeptModel, "DeptModel");

			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var oAppInput = this.byId("WID_APPID");
			var sAppId = oAppInput ? oAppInput.getValue().trim() : "";

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

			var oData = {
				tableDataGD: [{}]
			};
			var oModel = new sap.ui.model.json.JSONModel(oData);
			this.getView().setModel(oModel);

			var oViewModel = new sap.ui.model.json.JSONModel({
				isEditable: false
			});
			this.getView().setModel(oViewModel, "viewModel");

			var oViewModel = new sap.ui.model.json.JSONModel({
				isComboEditable: false
			});
			this.getView().setModel(oViewModel, "viewModel");

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
				}
			});
			// Added by srikanth
			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("Workflow").attachPatternMatched(this.fnRouter, this);

		},
		fnRouter: function() {

			this.fnclearSection();
		},

		fnNavBack: function() { // Added by srikanth
			sap.ui.core.UIComponent.getRouterFor(this).navTo("HomePage");
		},

		// Fragment open
		fnGetCreateVar: function() {

			this.disableCheckbox = false;
			var oModel = this.getView().getModel("JMConfig");

			var oAppInput = this.byId("WID_APPID");
			var sFullValue = oAppInput ? oAppInput.getValue().trim() : "";
			var sAppId = sFullValue.split("-")[0].trim();

			if (!sAppId) {

				ErrorHandler.showCustomSnackbar("Please enter Application ID", "Information", this);
				return;
			}
			if (this.fn_checkUnsavedNewRows()) {
				this.fn_openUnsavedConfirmFragment();
				return;
			} else {
				this.fngetvar();
			}
		},
		fngetvar: function() {
			var oModel = this.getView().getModel("JMConfig");

			var oAppInput = this.byId("WID_APPID");
			var sFullValue = oAppInput ? oAppInput.getValue().trim() : "";
			var sAppId = sFullValue.split("-")[0].trim();
			//this.lockWorkflowView(sAppId);
			this.fn_CreateVar_frag();
			oModel.read("/WFViewSet", {
				filters: [new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)],
				success: function(oData) {
					var aAllViews = oData.results;

					var aUniqueVariants = [];
					var oSeen = {};

					aAllViews.forEach(function(item) {
						if (!oSeen[item.Variant]) {
							oSeen[item.Variant] = true;
							aUniqueVariants.push({
								Variant: item.Variant
							});
						}
					});
					var vVariantValue = aUniqueVariants.length > 0 ? aUniqueVariants[0].Variant : null;
					var vAllViewBind = [];
					var vAllView = this.getView().getModel('WFVariableModel').getData();
					var vMergedArray = vAllView.map(function(oItemView) {
						var oMatch = aAllViews.find(function(oItemMacth) {
							return vVariantValue === oItemMacth.Variant && oItemView.ViewName === oItemMacth.ViewName;
						});

						if (oMatch) {
							vAllViewBind.push({
								ViewId: oItemView.ViewId,
								ViewName: oItemView.ViewName,
								ReadOnly: oMatch.ReadOnly,
								Active: oMatch.Active,
								Editable: false
							});
						} else {
							vAllViewBind.push({
								ViewId: oItemView.ViewId,
								ViewName: oItemView.ViewName,
								ReadOnly: false,
								Active: false,
								Editable: false
							});
						}
					});

					var oViewModel = new sap.ui.model.json.JSONModel({
						allViews: aAllViews,
						views: vAllViewBind,
						variants: aUniqueVariants
					});

					this.getView().setModel(oViewModel, "WFViewModel");
					var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
					oTable.setSelectedIndex(0);
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});

		},
		proceedWithVariableCreation: function() {
			var oModel = this.getView().getModel("JMConfig");
			var oAppInput = this.byId("WID_APPID");
			var sFullValue = oAppInput ? oAppInput.getValue().trim() : "";
			var sAppId = sFullValue.split("-")[0].trim();
			this.fn_CreateVar_frag();
			oModel.read("/WFViewSet", {
				filters: [new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)],
				success: function(oData) {
					var aAllViews = oData.results;

					var aUniqueVariants = [];
					var oSeen = {};

					aAllViews.forEach(function(item) {
						if (!oSeen[item.Variant]) {
							oSeen[item.Variant] = true;
							aUniqueVariants.push({
								Variant: item.Variant
							});
						}
					});
					var vVariantValue = aUniqueVariants[0].Variant;

					var vAllViewBind = [];
					var vAllView = this.getView().getModel('WFVariableModel').getData();
					var vMergedArray = vAllView.map(function(oItemView) {
						var oMatch = aAllViews.find(function(oItemMacth) {

							return vVariantValue === oItemMacth.Variant && oItemView.ViewName === oItemMacth.ViewName;

						});

						if (oMatch) {
							vAllViewBind.push({
								ViewId: oItemView.ViewId,
								ViewName: oItemView.ViewName,

								ReadOnly: oMatch.ReadOnly,
								Active: oMatch.Active,
								Editable: false
							});
						} else {
							vAllViewBind.push({
								ViewId: oItemView.ViewId,
								ViewName: oItemView.ViewName,

								ReadOnly: false,
								Active: false,
								Editable: false
							});
						}
					});

					var oViewModel = new sap.ui.model.json.JSONModel({
						allViews: aAllViews,
						views: vAllViewBind,
						variants: aUniqueVariants
					});

					this.getView().setModel(oViewModel, "WFViewModel");
					var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
					oTable.setSelectedIndex(0);
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},
		lockWorkflowView: function(sAppId) {
			var omodel = this.getOwnerComponent().getModel("JMConfig");
			var that = this;
			var oUserModel = this.getView().getModel("UserModel");
			var sSyUser = oUserModel ? oUserModel.getProperty("/Uname") : "";

			var oPayload = {
				AppId: sAppId,
				Variant: "",
				Flag: true,
				SyUser: sSyUser,
				Response: ""
			};
			omodel.create("/WFView_FinalSet", oPayload, {
				success: function(oData) {
					var sResponse = oData.Response || "";

					if (sResponse === "Lock acquired successfully") {
						console.log(sResponse);
						that.proceedWithVariableCreation(); //  proceed
					} else if (sResponse.startsWith("Locked by")) {
						sap.m.MessageBox.warning("Locked by ", sSyUser); // shows "Locked by [user]"
					}
				},

			});
		},

		fn_CreateVar_frag: function(oEvent) {
			if (!this.CreateVarfrag) {
				this.CreateVarfrag = sap.ui.xmlfragment("createVarFragId", "WorkflowRules.fragment.CreateVariable", this);
				this.getView().addDependent(this.CreateVarfrag);
				var oF4Input = sap.ui.core.Fragment.byId("createVarFragId", "ID_VARIANT_F4");
				if (oF4Input) {
					oF4Input.setValue(""); // Clear value
					oF4Input.setSelectedKey(""); // Just in case it's used with items
					oF4Input.setValueState("None"); // Clear any error state
				}

			}

			this.CreateVarfrag.open();
		},
		onCancelCreateVar: function() {
			if (this.CreateVarfrag) {
				this.CreateVarfrag.close();
				this.CreateVarfrag.destroy();
				this.CreateVarfrag = null;
			}
			this.hasResetOnce = false;
			this.editelection = false;
			var oUserModel = this.getView().getModel("UserModel");
			var oAppInput = this.byId("WID_APPID");
			var sFullValue = oAppInput ? oAppInput.getValue().trim() : "";
			var sAppId = sFullValue.split("-")[0].trim();

			var sSyUser = oUserModel ? oUserModel.getProperty("/Uname") : "";

			if (sAppId && sSyUser) {
				var oModel = this.getView().getModel("JMConfig");

				var oPayload = {
					AppId: sAppId,
					Variant: "",
					Flag: false,
					SyUser: sSyUser,
					Response: ""
				};

				oModel.create("/WFView_FinalSet", oPayload, {
					success: function(oData) {
						// console.log("Unlocked:", oData.Response); // optional
					},
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}.bind(this)
				});
			}

		},

		onSelectCheckbox: function(oEvent) {
			var bSelected = oEvent.getParameter("selected");
			var oContext = oEvent.getSource().getBindingContext("WFViewModel");

			if (oContext) {
				var oModel = oContext.getModel();
				var sPath = oContext.getPath();

				oModel.setProperty(sPath + "/selected", bSelected);
				if (!bSelected) {
					oModel.setProperty(sPath + "/ReadOnly", false);
				}

			}
		},

		FnchangeVar: function() {
			var oView = this.getView();
			var oWFModel = oView.getModel("WFViewModel");
			var aViews = oWFModel.getProperty("/views") || [];
			var oVarModel = oView.getModel("WFVariableModel");
			var oDataModel = this.getOwnerComponent().getModel("JMConfig");

			var oPayload = this._tempVariantData;
			if (this.editselection) {
				var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
				var iSelectedIndex = oTable.getSelectedIndex();

				if (iSelectedIndex !== -1) {
					var oContext = oTable.getContextByIndex(iSelectedIndex);
					var oSelectedRow = oContext.getObject();
					if (oSelectedRow && oSelectedRow.Variant) {
						oPayload.Variant = oSelectedRow.Variant;
					}
				}
			}

			if (this.editselection && !oPayload.Variant) {
				oPayload.Variant = this._selectedVariantName || "";
			}

			if (!oPayload || !oPayload.Variant || !oPayload.Views || oPayload.Views.length === 0) {
				ErrorHandler.showCustomSnackbar("Missing Variant name or Views", "Warning", this);
				return;
			}

			var oAppInput = this.byId("WID_APPID");
			var sFullValue = oAppInput ? oAppInput.getValue().trim() : "";
			var sAppId = sFullValue.split("-")[0].trim();
			var sVariant = oPayload.Variant.trim().toUpperCase();
			var aSelectedViews = oPayload.Views;
			var aAllViews = oWFModel.getProperty("/allViews") || [];

			var oFinalPayload = {
				AppId: sAppId,
				Variant: sVariant,
				Flag: "M",
				Navvariant: aSelectedViews.map(function(v) {
					return {
						AppId: sAppId,
						Variant: sVariant,
						ViewId: v.ViewId,
						ViewName: v.ViewName,
						Active: !!v.Active,
						ReadOnly: !!v.ReadOnly
					};
				})
			};
			// Send to backend
			oDataModel.setUseBatch(false);
			var that = this;
			oDataModel.create("/WFVariantSet", oFinalPayload, {
				success: function() {

					ErrorHandler.showCustomSnackbar("Variant Saved Successfully", "success", this);

					var aFiltered = aAllViews.filter(function(v) {
						return v.Variant !== sVariant;
					});
					var aFinalList = aSelectedViews.map(function(v) {
						return {
							AppId: sAppId,
							Variant: sVariant,
							ViewId: v.ViewId,
							ViewName: v.ViewName,
							Active: !!v.Active,
							ReadOnly: !!v.ReadOnly
						};
					});
					oWFModel.setProperty("/allViews", aFiltered.concat(aFinalList));

					// Update /variants if new
					var aVariants = oWFModel.getProperty("/variants") || [];
					var bExists = aVariants.some(function(v) {
						return v.Variant === sVariant;
					});
					if (!bExists) {
						aVariants.push({
							Variant: sVariant
						});
						oWFModel.setProperty("/variants", aVariants);
					}

					var aUpdatedVariables = aSelectedViews.map(function(v) {
						return {
							ViewName: v.ViewName,
							Active: !!v.Active,
							ReadOnly: !!v.ReadOnly
						};
					});
					oVarModel.setProperty("/allVariables", aUpdatedVariables);

					// Clear input
					var oInput = sap.ui.core.Fragment.byId("createVarFragId", "ID_VAR");
					if (oInput) {
						oInput.setValue("");
					}
					aViews.forEach(function(view) {
						view.Editable = false;
					});
					oWFModel.setProperty("/views", aViews);
					that.fngetvar();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});

			// Close confirm dialog
			if (this.ConfirmSave) {
				this.ConfirmSave.close();
				this.ConfirmSave.destroy();
				this.ConfirmSave = null;
			}
			this.editselection = false;
		},
		onAddGDRow: function() {
			// Safe emptiness check
			function isEmptyField(val) {
				return val === undefined || val === null || (typeof val === "string" && val.trim() === "");
			}
			if (!this._bAddEnabled) {
				return;
			}
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			// this.byId("id_Mass").setEnabled(false);
			this.byId("id_Copy").setEnabled(false);
			var oModel = this.getView().getModel("GDTableModel");
			var aData = oModel.getProperty("/GDTableData") || [];
			if (aData.length > 0) {
				var oLastRow = aData[aData.length - 1];
				if (oLastRow.isNew) {

					ErrorHandler.showCustomSnackbar("Please save the current row before adding a new one", "Information");
					return;
				}
			}

			if (aData.length > 0) {
				var oLastRow = aData[aData.length - 1];

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
				// oTable.scrollToIndex(iNewIndex);
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
				if (agent.StartDate) {
					var parts = agent.StartDate.split(".");
					agent._StartDateObj = new Date(+parts[2], parts[1] - 1, +parts[0]);
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
					// sap.m.MessageToast.show("Please fill the previous row completely before adding a new row.");
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

		onTypeLvlComboChange: function(oEvent) {
			var oComboBox = oEvent.getSource();
			var sEnteredText = oComboBox.getValue();
			var sSelectedKey = oComboBox.getSelectedKey();
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
		onAddAARow: function() {
			if (!this._bAddEnabled) return;

			var oView = this.getView();
			var oTable = oView.byId("id_Agent");
			var oLDTable = oView.byId("id_LDTable");
			var oLDModel = oView.getModel("LDTableModel");
			var oModel = oView.getModel("AATableModel");

			var aAARows = oModel.getProperty("/tableDataAA") || [];
			var aLDRows = oLDModel.getProperty("/tableDataNew") || [];
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var bIsMassMaterial = sAppId.startsWith("MM") || sAppId.startsWith("RC") || sAppId.startsWith("BC") || sAppId.startsWith("PVMC") ||
				sAppId.startsWith("BX") || sAppId.startsWith("RX") || sAppId.startsWith("PHC") || sAppId.startsWith("PHX") || sAppId.startsWith("PM") ||
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
			if (iLDIndex < 0) return;

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
		_isValidFutureDate: function(oDate) {
			if (!(oDate instanceof Date) || isNaN(oDate)) {
				return false;
			}

			oDate.setHours(0, 0, 0, 0);

			var oToday = new Date();
			oToday.setHours(0, 0, 0, 0);

			return oDate >= oToday;
		},
		_checkMinApprCompletion: function() {
			var oView = this.getView();
			var oLDTable = oView.byId("id_LDTable");
			var oLDModel = oView.getModel("LDTableModel");
			var oModel = oView.getModel("AATableModel");

			var aLDRows = oLDModel.getProperty("/tableDataNew") || [];
			var aAARows = oModel.getProperty("/tableDataAA") || [];

			var iLDIndex = oLDTable.getSelectedIndex();
			if (iLDIndex < 0) return;

			var oSelectedLDRow = oLDTable.getContextByIndex(iLDIndex).getObject();
			var oAddImage = oView.byId("AddImage1");
			if (!oSelectedLDRow) return;
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
				sAppId.startsWith("BX") || sAppId.startsWith("RX") || sAppId.startsWith("PHC") || sAppId.startsWith("PHX") || sAppId.startsWith("PM") ||
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
					if (oAddImage) oAddImage.addStyleClass("cl_AddDelete");
					return;
				}

				if (iCompleteCount >= iMinAppr && !bHasIncomplete) {
					this._bAddEnabledLD = true;
					if (oAddImage) oAddImage.removeStyleClass("cl_AddDelete");
				} else {
					this._bAddEnabledLD = false;
					if (oAddImage) oAddImage.addStyleClass("cl_AddDelete");
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
					if (oAddImage) oAddImage.removeStyleClass("cl_AddDelete");
				} else {
					this._bAddEnabledLD = false;
					if (oAddImage) oAddImage.addStyleClass("cl_AddDelete");
				}
			}
		},
		onActiveSelect: function(oEvent) {
			this._checkMinApprCompletion();
		},

		onGDInputChange: function(oEvent) {
			var oView = this.getView();
			var oGDModel = oView.getModel("GDTableModel");
			var aFullData = oGDModel.getProperty("/GDTableData") || [];

			var oInput = oEvent.getSource();
			var oContext = oInput.getBindingContext("GDTableModel");
			if (!oContext) return;
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
		onMinApprLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var sValue = oInput.getValue();
			var iValue = parseInt(sValue, 10);
			if (!/^\d+$/.test(sValue) || parseInt(sValue, 10) === 0) {
				var sPath = oContext.getPath();
				ErrorHandler.showCustomSnackbar("Please enter a valid Min role", "Warning", this);
				oInput.setValue("");
				oContext.getModel().setProperty(sPath + "/MinAppr", "");
				return;
			}

			var oContext = oInput.getBindingContext("LDTableModel");
			if (!oContext || isNaN(iValue)) return;

			var sPath = oContext.getPath();

			oContext.getModel().setProperty(sPath + "/MinAppr", sValue);

			this._checkMinApprCompletion();
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
		fn_delete_frag: function(oEvent) {
			if (!this.Deletefrag) {
				this.Deletefrag = sap.ui.xmlfragment("WorkflowRules.fragment.del", this);
				this.getView().addDependent(this.Deletefrag);
			}
			this.Deletefrag.open();
		},
		onDeleteSelectedRows: function() {
			if (!this._bAddEnabled) {
				return;
			}

			if (this.Deletefrag) {
				this.Deletefrag.close();
				this.Deletefrag.destroy();
				this.Deletefrag = null;
			}

			var oTable = this.byId("id_ResultTable");
			var oGDModel = this.getView().getModel("GDTableModel");

			var aData = oGDModel.getProperty("/GDTableData") || [];
			var aSelectedIndices = oTable.getSelectedIndices();

			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar("Please select a row to delete", "Information", this);
				return;
			}

			var aSelectedObjects = aSelectedIndices.map(function(iIndex) {
				return oTable.getContextByIndex(iIndex).getObject();
			});

			var aNewData = aData.filter(function(oRow) {
				return !aSelectedObjects.includes(oRow);
			});

			// Update model
			oGDModel.setProperty("/GDTableData", aNewData);
			oGDModel.refresh(true);

			oTable.clearSelection();
			oTable.setVisibleRowCount(10);
		},

		onCanceldelete: function() {
			if (this.Deletefrag) {
				this.Deletefrag.close();
				this.Deletefrag.destroy();
				this.Deletefrag = null;
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
			// Open dialog
			// this.fn_deleteLD_frag();
		},
		fn_deleteLD_frag: function(sMsg) {
			if (!this.fnvalidateDeleteLD()) {
				return;
			}
			if (!this.DeleteLDfrag) {
				this.DeleteLDfrag = sap.ui.xmlfragment("WorkflowRules.fragment.delLD", this);
				this.getView().addDependent(this.DeleteLDfrag);
			}

			this.DeleteLDfrag.open();
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

			// Remove from model (both saved and new)
			// var aNewData = aData.filter(function(oRow, idx) {
			// 	return !aSelectedIndices.includes(idx);
			// });
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

			// Close confirmation fragment if needed
			// 	// Close fragment if open
			if (this.DeleteLDfrag) {
				this.DeleteLDfrag.close();
				this.DeleteLDfrag.destroy();
				this.DeleteLDfrag = null;
			}

		},

		onDeleteWorkflowData: function() {
			var that = this;
			// this.byId("id_Mass").setEnabled(true);
			this.byId("id_Copy").setEnabled(true);
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var oLDModel = this.getView().getModel("LDTableModel");
			// var oTable = this.byId("id_LDTable");
			var gTable = this.byId("id_ResultTable");
			var aLDData = oLDModel.getProperty("/tableDataNew") || [];
			var aSelectedIndices = gTable.getSelectedIndices();

			if (aSelectedIndices.length === 0) {
				// sap.m.MessageToast.show("Please select at least one row to delete.");
				ErrorHandler.showCustomSnackbar("Please select at least one row to delete.", "Information", this);
				return;
			}

			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var oResultTable = this.byId("id_ResultTable");
			var iSelectedIndex = oResultTable.getSelectedIndex();

			if (iSelectedIndex === -1) {
				// sap.m.MessageToast.show("Please select a row in the result table.");
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

			//  Prepare deletion payload
			var aToDelete = aLDData.filter(function(row, index) {
				return aSelectedIndices.includes(index);
			});

			if (!aToDelete.length) {
				// sap.m.MessageToast.show("No valid data selected to delete.");
				ErrorHandler.showCustomSnackbar("No valid data selected to delete", "Information", this);
				return;
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
					// sap.m.MessageToast.show("Selected workflow rows deleted.");
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
		onCancelDeleteLDDialog: function() {
			if (this.DeleteLDfrag) {
				this.DeleteLDfrag.close();
				this.DeleteLDfrag.destroy();
				this.DeleteLDfrag = null;
			}
		},
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
			// this.fn_deleteAA_frag();

		},

		fn_deleteAA_frag: function(oEvent) {
			if (!this.fnvalidateDeleteAA()) {
				return;
			}
			if (!this.DeleteAAfrag) {
				this.DeleteAAfrag = sap.ui.xmlfragment("WorkflowRules.fragment.delAA", this);
				this.getView().addDependent(this.DeleteLDfrag);
			}
			this.DeleteAAfrag.open();
		},

		onDeleteSelectedRowsAA: function() {
			if (!this._bAddEnabled) return;

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
				// sap.m.MessageToast.show(" Agent removed.");
			}
		},
		onCancelDeleteAADialog: function() {
			if (this.DeleteAAfrag) {
				this.DeleteAAfrag.close();
				this.DeleteAAfrag.destroy();
				this.DeleteAAfrag = null;
			}
		},

		onCopySelectedRowGD: function() {
			var oView = this.getView();
			var oTable = this.byId("id_ResultTable");
			var oTableModel = oView.getModel(); // JSON model
			var aTableData = oTableModel.getProperty("/tableDataGD") || [];

			// Get selected row
			var aSelectedIndices = oTable.getSelectedIndices();
			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar("Please select a row to copy.", "Error", this);
				return;
			}

			var iSelectedIndex = aSelectedIndices[0];
			var oSelectedRow = oTable.getContextByIndex(iSelectedIndex).getObject();

			// Get LD and AA full lists
			var oLDModel = oView.getModel("JScreen");
			var oAAModel = oView.getModel("JScreenAA");

			var aLDList = oLDModel ? oLDModel.getProperty("/List") : [];
			var aAAList = oAAModel ? oAAModel.getProperty("/List") : [];

			var sField1 = oSelectedRow.field1;
			var sField2 = oSelectedRow.field2;

			var aLDTableData = aLDList.filter(function(item) {
				return item.field1 === sField1 && item.field2 === sField2; // match criteria
			});

			var aAATableData = aAAList.filter(function(item) {
				return item.field1 === sField1 && item.field2 === sField2;
			});

			// Deep copy and mark as new
			aLDTableData = JSON.parse(JSON.stringify(aLDTableData));
			aLDTableData.forEach(function(item) {
				item.isNew = true;
			});

			aAATableData = JSON.parse(JSON.stringify(aAATableData));
			aAATableData.forEach(function(item) {
				item.isNew = true;
			});

			// Copy selected row
			var oCopiedRow = JSON.parse(JSON.stringify(oSelectedRow));
			oCopiedRow.isNew = true;
			oCopiedRow.LDTableData = aLDTableData;
			oCopiedRow.tableDataAA = aAATableData;

			// Insert after selected row
			aTableData.splice(iSelectedIndex + 1, 0, oCopiedRow);
			oTableModel.setProperty("/tableDataGD", aTableData);

			// Scroll to new row
			oTable.setFirstVisibleRow(iSelectedIndex + 1);
		},
		fn_MassDelete: function() {
			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you sure you want to delete?",
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "MassDelete"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},
		fn_MassDeletePress: function() {
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();

			var that = this;
			// var oPayload = {
			// 	AppId: sAppId,
			// 	WfParm1From: wfparm1,
			// 	WfParm1To: "",
			// 	WfParm2From: wfparm2,
			// 	WfParm2To: "",
			// 	WfParm3From: "",
			// 	WfParm3To: "",
			// 	WfParm4From: "",
			// 	WfParm4To: "",
			// 	Flag: "D"
			// };
			var oPayload = {
				AppId: sAppId,
				Flag: "D"
			};

			// Get dynamic parameter fields from the JScreenParm model
			var aParms = this.getView().getModel("JScreenParm").getProperty("/List") || [];
			if (aParms.length > 0) {
				var oParmRow = aParms[0];
				for (var i = 1; i <= 4; i++) {
					var sFieldId = oParmRow["WfParm" + i + "Id"];
					if (sFieldId) {
						var oInput = sap.ui.getCore().byId(sFieldId) || this.byId(sFieldId);
						if (oInput) {
							var sValue = oInput.getValue().trim();
							oPayload["WfParm" + i + "From"] = sValue;
							oPayload["WfParm" + i + "To"] = ""; // or implement range if needed
						}
					}
				}
			}
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			oModel.create("/WFCopySet", oPayload, {
				success: function(oData) {
					ErrorHandler.showCustomSnackbar("Mass delete successful.", "Error", that);
					that.fnSaveGdBehaviour();

				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});

		},
		fn_MassDeleteCancel: function() {
			if (this.massdelfrag) {
				this.massdelfrag.close();
				this.massdelfrag.destroy();
				this.massdelfrag = null;
			}
		},
		onEditRow: function() {
			this.fn_Change_frag();
		},
		fn_Change_frag: function(oEvent) {
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

			// this.byId("id_Mass").setEnabled(true);
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
			// this.byId("ID_VARIANT_INPUT").addStyleClass("cl_chtabInput");
			this.getView().getModel("viewModel").setProperty("/isComboEditable", true);
			this.getView().getModel("viewModel").setProperty("/isEditable", true);
			var aParms = this.getView().getModel("JScreenParm").getProperty("/List") || [];
			var ValueEntered = false;

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
			// this.byId("id_massdel").setEnabled(ValueEntered);
			// this.byId("idConfirmDialog").close();
			// this.Changefrag.close();

		},

		onNavigateToDash: function() {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("dashboard");
		},
		onNavigateToSearch: function() {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("search");
		},
		onNavigateToUWL: function() {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("uwl");
		},

		// Application Initial  ID fragment Open
		fnGetinitialAppID: function() {
			this.fn_ApplID_frag();
		},
		// open in process wise mass copy
		fnGetAppID: function(oEvent) {
			this._oF4SourceInput = oEvent.getSource();
			this.fn_ApplID_frag();
		},
		fn_ApplID_frag: function(oEvent) {
			if (!this.ApplicationIDfrag) {
				this.ApplicationIDfrag = sap.ui.xmlfragment("WorkflowRules.fragment.AppIdWorkflow", this);
				this.getView().addDependent(this.ApplicationIDfrag);
			}
			this.ApplicationIDfrag.open();

		},

		checkWfParmsForAppId: function(sAppId) {
			return new Promise(function(resolve, reject) {
				if (!sAppId) {
					resolve(null);
					return;
				}

				var oModel = this.getOwnerComponent().getModel("JMConfig");

				oModel.read("/WFParmSet", {
					filters: [new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)],
					success: function(oData) {
						var aParms = [];
						if (oData.results.length > 0) {
							var oEntry = oData.results[0]; // assume only one entry per AppId
							for (var i = 1; i <= 4; i++) {
								var sIdKey = "WfParm" + i + "Id";
								var sNameKey = "WfParm" + i + "Name";
								if (oEntry[sIdKey]) {
									aParms.push({
										id: oEntry[sIdKey],
										name: oEntry[sNameKey]
									});
								}
							}
						}
						resolve(aParms);
					},
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
						resolve(null); // resolve safely instead of reject
					}.bind(this)
				});
			}.bind(this));
		},
		fnGetView: function() {
			var oModel = this.getView().getModel("JMConfig");
			var oAppInput = this.byId("WID_APPID");
			var sAppId = oAppInput.getValue().split("-")[0].trim();
			var that = this;
			oModel.read("/WF_VariableSet", {
				filters: [new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)],
				success: function(oData) {
					var oVariableModel = new sap.ui.model.json.JSONModel();
					oVariableModel.setData(oData.results);

					that.getView().setModel(oVariableModel, "WFVariableModel");

				},
				error: function(oError) {

				}
			});
		},

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

		fnPlantSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = [
				new sap.ui.model.Filter("Value1", sap.ui.model.FilterOperator.Contains, sValue),
				new sap.ui.model.Filter("Value2", sap.ui.model.FilterOperator.Contains, sValue)
			];

			var oBinding = oEvent.getSource().getBinding("items");
			var oFinalFilter = new sap.ui.model.Filter(oFilter, false);
			oBinding.filter(oFinalFilter);
		},

		fnMaterialTypeSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = [
				new sap.ui.model.Filter("Value1", sap.ui.model.FilterOperator.Contains, sValue),
				new sap.ui.model.Filter("Value2", sap.ui.model.FilterOperator.Contains, sValue)
			];

			var oBinding = oEvent.getSource().getBinding("items");
			var oFinalFilter = new sap.ui.model.Filter(oFilter, false);
			oBinding.filter(oFinalFilter);
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
		fn_ChangeSearch_frag: function(oEvent) {
			if (!this.ChangeSearch) {
				this.ChangeSearch = sap.ui.xmlfragment("WorkflowRules.fragment.ChangeSearch", this);
				this.getView().addDependent(this.ChangeSearch);
			}
			this.ChangeSearch.open();
		},

		onFilterTableDataGD: function() {

			var oView = this.getView();
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
				// sap.m.MessageToast.show("Please enter App ID");
				ErrorHandler.showCustomSnackbar("Please enter Application ID", "Information", this);
				return;
			}

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
						var iRowCount = Math.min(aResults.length, 11);
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
				var oParmRow = aParms[0];
				for (var i = 1; i <= 4; i++) {
					var sFieldId = oParmRow["WfParm" + i + "Id"];
					if (sFieldId) {
						var oInput = this.getView().byId(sFieldId).setEditable(false);
					}
				}
			}
			oTable.setSelectedIndex(0);

		},

		// Validation for Application ID
		onMaterialTypeInput: function(oEvent) {

			var oAppInput = this.byId("WID_APPID");
			var sAppId = oAppInput.getValue().trim();

			if (!sAppId) {

				// focus back to the input
				oAppInput.focus();

				// this.byId("id_mandt").setVisible(true);
			}

		},

		// Updated: onPressMass
		onPressMass: function() {
			var oView = this.getView();
			var sAppId = oView.byId("WID_APPID").getValue();
			var aParms = oView.getModel("JScreenParm").getProperty("/List") || [];
			var oParmRow = aParms[0] || {};
			var oMassInputData = {
				AppId: sAppId
			};
			var bAnyParamGiven = false;

			["1", "2", "3", "4"].forEach(function(i) {
				var sKey = "WfParm" + i;
				var sFieldId = oParmRow[sKey + "Id"];
				var oInput = sFieldId && sap.ui.getCore().byId(sFieldId);
				var sVal = oInput ? oInput.getValue().trim() : "";
				oMassInputData[sKey] = sVal;
				if (sVal) bAnyParamGiven = true;
			});

			var bOnlyAppId = !!sAppId && !bAnyParamGiven;

			oView.setModel(new sap.ui.model.json.JSONModel(oMassInputData), "MassInputModel");
			oView.setModel(new sap.ui.model.json.JSONModel({
				settings: {
					showParamFields: bAnyParamGiven,
					showAppFields: true,
					isProcessWiseSelected: bOnlyAppId,
					isParamWiseDisabled: bOnlyAppId
				}
			}), "copyModel");

			if (!this.pMassDialog) {
				this.pMassDialog = sap.ui.xmlfragment("massFragId", "WorkflowRules.fragment.Mass", this);
				oView.addDependent(this.pMassDialog);
			}
			this.pMassDialog.open();

			var oGroup = sap.ui.core.Fragment.byId("massFragId", "massgroup");
			if (oGroup) {
				oGroup.setSelectedIndex(bOnlyAppId ? 1 : 0);
				var aButtons = oGroup.getButtons();
				aButtons[0].setEnabled(!bOnlyAppId);
				aButtons[1].setEnabled(true);

				this.onRadioSelectMass({
					getParameter: function(sName) {
						return sName === "selectedIndex" ? oGroup.getSelectedIndex() : null;
					}
				});
			}
		},

		onRadioSelectMass: function(oEvent) {
			var oView = this.getView();
			var oVBox = sap.ui.core.Fragment.byId("massFragId", "dynamicBox");
			oVBox.removeAllItems();

			var iSelectedIndex = oEvent.getParameter("selectedIndex");
			var oJScreenModel = oView.getModel("JScreenParm");
			var oMassInputModel = oView.getModel("MassInputModel");
			var oData = oJScreenModel.getProperty("/List/0") || {};

			if (iSelectedIndex === 0) { // Parameter-wise
				// --- Selected Value Row ---
				var oSelHBox = new sap.m.HBox({
						alignItems: "Center",
						justifyContent: "Start"
					})
					.addStyleClass("sapUiSmallMarginBottom");

				oSelHBox.addItem(new sap.m.Text({
						text: "Selected Value",
						width: "100px"
					})
					.addStyleClass("sapUiSmallMarginEnd sapUiSmallMarginTopBottom"));

				["1", "2", "3", "4"].forEach(function(i, idx) {
					var sKey = "WfParm" + i;
					var sName = oData[sKey + "Name"];
					var sVal = oMassInputModel.getProperty("/" + sKey);
					if (sName && sVal) {
						var oVBoxItem = new sap.m.VBox().addStyleClass(idx === 0 ? "sapUiSmallMarginEnd" : "sapUiSmallMarginBegin");
						oVBoxItem.addItem(new sap.m.Label({
							text: sName
						}));
						oVBoxItem.addItem(new sap.m.Input({
							value: sVal,
							editable: false,
							width: "8rem"
						}));
						oSelHBox.addItem(oVBoxItem);
					}
				});
				oVBox.addItem(oSelHBox);

				// --- New Value Row ---
				var oNewHBox = new sap.m.HBox({
					alignItems: "Center",
					justifyContent: "Start"
				});
				oNewHBox.addItem(new sap.m.Text({
						text: "New Value",
						width: "100px"
					})
					.addStyleClass("sapUiSmallMarginTopBottom"));

				["1", "2", "3", "4"].forEach(function(i) {
					var sKey = "WfParm" + i;
					var sName = oData[sKey + "Name"];
					var sVal = oMassInputModel.getProperty("/" + sKey);
					if (sName && sVal) {
						var oVBoxItem = new sap.m.VBox().addStyleClass("sapUiSmallMarginBeginEnd");
						oVBoxItem.addItem(new sap.m.Label({
							text: sName
						}));

						var oInput = new sap.m.Input({
							value: "{MassInputModel>/New" + sKey + "}",
							width: "8rem",
							showValueHelp: true,
							valueHelpOnly: true
						}).addStyleClass("cl_gdInput");

						oInput.addCustomData(new sap.ui.core.CustomData({
							key: "parmKey",
							value: sKey
						}));
						oInput.attachValueHelpRequest(this.fn_GenericMassValueHelpRequest, this);

						oVBoxItem.addItem(oInput);
						oNewHBox.addItem(oVBoxItem);
					}
				}.bind(this));
				oVBox.addItem(oNewHBox);

			} else if (iSelectedIndex === 1) { // Process-wise
				var sAppId = oMassInputModel.getProperty("/AppId");
				var bOnlyAppId = !!sAppId && !["WfParm1", "WfParm2", "WfParm3", "WfParm4"].some(function(k) {
					return oMassInputModel.getProperty("/" + k);
				});

				if (bOnlyAppId) {
					oVBox.addItem(new sap.m.HBox({
						items: [
							new sap.m.Text({
								text: "From App ID"
							}).addStyleClass("sapUiSmallMarginEnd sapUiTinyMarginTop"),
							new sap.m.Input({
								id: "id_fromappid",
								value: sAppId,
								editable: false
							})
							.addStyleClass("sapUiTinyMarginEnd sapUiSizeCompact")
						]
					}));

					oVBox.addItem(new sap.m.HBox({
						items: [
							new sap.m.Text({
								text: "To App ID"
							}).addStyleClass("sapUiSmallMarginEnd sapUiTinyMarginTop"),
							new sap.m.Input({
								id: "id_toappid",
								showValueHelp: true,
								valueHelpOnly: true
							}).addStyleClass("CL_inputarrow cl_gdInput cl_box cl_s_customComboBox cl_massIp sapUiTinyMarginEnd sapUiSizeCompact")
							.attachValueHelpRequest(this.fnGetAppID, this)
						]
					}));

				} else {
					// --- Selected Value Row ---
					var oSelHBox2 = new sap.m.HBox({
							alignItems: "Center",
							justifyContent: "Start"
						})
						.addStyleClass("sapUiSmallMarginBottom");
					oSelHBox2.addItem(new sap.m.Text({
							text: "Selected Value"
						})
						.addStyleClass("sapUiSmallMarginEnd sapUiSmallMarginTopBottom"));

					["AppId", "WfParm1", "WfParm2", "WfParm3", "WfParm4"].forEach(function(sKey) {
						var sVal = oMassInputModel.getProperty("/" + sKey);
						var sName = sKey === "AppId" ? "App ID" : oData[sKey + "Name"];
						if (sVal && sName) {
							var oVBoxItem = new sap.m.VBox().addStyleClass("sapUiSmallMarginBeginEnd");
							oVBoxItem.addItem(new sap.m.Label({
								text: sName
							}));
							oVBoxItem.addItem(new sap.m.Input({
								value: sVal,
								editable: false,
								width: "8rem"
							}));
							oSelHBox2.addItem(oVBoxItem);
						}
					});
					oVBox.addItem(oSelHBox2);

					// --- New Value Row ---
					var oNewHBox2 = new sap.m.HBox({
						alignItems: "Center",
						justifyContent: "Start"
					});
					oNewHBox2.addItem(new sap.m.Text({
							text: "New Value"
						})
						.addStyleClass("sapUiSmallMarginEnd sapUiSmallMarginTopBottom cl_NewValText"));

					["AppId", "WfParm1", "WfParm2", "WfParm3", "WfParm4"].forEach(function(sKey) {
						var sVal = oMassInputModel.getProperty("/" + sKey);
						var sName = sKey === "AppId" ? "App ID" : oData[sKey + "Name"];
						if (sVal && sName) {
							var oVBoxItem = new sap.m.VBox().addStyleClass("sapUiSmallMarginBeginEnd");
							oVBoxItem.addItem(new sap.m.Label({
								text: sName
							}));

							var oInput = new sap.m.Input({
								value: "",
								width: "8rem"
							}).addStyleClass("cl_gdInput");

							if (sKey === "AppId") {
								oInput.setShowValueHelp(true).setValueHelpOnly(true);
								oInput.attachValueHelpRequest(this.fnGetAppID, this);
							} else {
								oInput.setShowValueHelp(true).setValueHelpOnly(true);
								oInput.addCustomData(new sap.ui.core.CustomData({
									key: "parmKey",
									value: sKey
								}));
								oInput.attachValueHelpRequest(this.fn_GenericMassValueHelpRequest, this);
							}

							oVBoxItem.addItem(oInput);
							oNewHBox2.addItem(oVBoxItem);
						}
					}.bind(this));
					oVBox.addItem(oNewHBox2);
				}
			}

			// --- Adjust Dialog Width ---
			var oDialog = sap.ui.core.Fragment.byId("massFragId", "idMassCopyDialog");
			var iParmCount = ["WfParm1", "WfParm2", "WfParm3", "WfParm4"].filter(function(k) {
				return oMassInputModel.getProperty("/" + k);
			}).length;

			oDialog.setContentWidth(
				iParmCount === 4 ? "1000px" :
				iParmCount === 3 ? "800px" :
				iParmCount === 2 ? "600px" : "400px"
			);
		},
		onPressAgentChange: function() {

			this.fn_massAgent_frag();
		},
		fn_massAgent_frag: function(oEvent) {
			if (!this.MassAgentfrag) {

				this.MassAgentfrag = sap.ui.xmlfragment("massagentid", "WorkflowRules.fragment.MassAgent", this);
				this.getView().addDependent(this.MassAgentfrag);
			}

			this.MassAgentfrag.open();
			var oGroup = sap.ui.core.Fragment.byId("massagentid", "ID_MassAgent");
			if (oGroup) {
				oGroup.setSelectedIndex(0);

				// Trigger selection logic to build dynamic UI
				var oEvent = {
					getParameter: function(sName) {
						if (sName === "selectedIndex") {
							return oGroup.getSelectedIndex();
						}
					}
				};
				this.onMassAgentOptionSelect(oEvent);
			}

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
			}).addStyleClass("sapUiSmallMarginBottom");

			oHBoxSelected.addItem(new sap.m.Text({
				text: "Selected Value :-"
			}).addStyleClass("sapUiSmallMarginEnd sapUiSmallMarginTopBottom cl_inputLabel"));

			Object.keys(oSelected).forEach(function(key) {
				var sLabel = oJScreenParm[key + "Name"];
				if (!sLabel) return;

				var oParmVBox = new sap.m.VBox();
				oParmVBox.addItem(new sap.m.Label({
					text: sLabel
				}).addStyleClass("sapUiSmallMarginBeginEnd cl_inputLabel"));
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
						justifyContent: "Start"
					});

					oHBoxCreated.addItem(new sap.m.Text({
						text: "New Value :-"
					}).addStyleClass("sapUiMediumMarginEnd sapUiSmallMarginTopBottom cl_inputLabel"));

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
						}).addStyleClass("sapUiSmallMarginBegin cl_inputLabel"));

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
									this.fn_validateF4Value(field.id, val, function(bValid) {
										if (!bValid) {
											ErrorHandler.showCustomSnackbar("Invalid value for field.", "Error", this);
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
								this.fn_GenericCopyValueHelpRequest(oEvent);
							}.bind(this)
						}).addStyleClass("sapUiSmallMarginBegin cl_inputField");

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
			var vSelectedIndex = vGeneralTable.getSelectedIndex();
			var vSelectedRow = vGeneralTable.getContextByIndex(vSelectedIndex).getObject();
			var vLevelCopy = JSON.parse(JSON.stringify(
				(vSelectedRow.Navleveldef && vSelectedRow.Navleveldef.results)));
			var vAgentCopy = JSON.parse(JSON.stringify(
				(vSelectedRow.Navagentassign && vSelectedRow.Navagentassign.results)));
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

		onRowSelectionChange: function(oEvent) {

			if (this._bSkipLDLoad || this._bRevertSelection) {
				return;
			}

			var oTable = this.byId("id_ResultTable");
			var oLDTable = this.byId("id_LDTable");
			var iIndex = oTable.getSelectedIndex();
			if (iIndex < 0) {
				return;
			}

			// var oModel = this.getView().getModel("GDTableModel");
			// var aData = oModel.getProperty("/GDTableData") || [];

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
					var oTable = that.byId("id_ResultTable");
					oTable.setSelectedIndex(0);
					that.change = false;
				}, 200);
			} else if (oLastRow && oLastRow.isNew && iIndex !== iLastIndex) {
				ErrorHandler.showCustomSnackbar("Please save the current row before selecting another.", "Error", this);

				this._bRevertSelection = true;
				oTable.setSelectedIndex(iLastIndex); // triggers 2nd call, but will be ignored
				this._bRevertSelection = false;

				oTable.scrollToIndex(iLastIndex);

				// Select last row in LD table
				var oLDModel = this.getView().getModel("LDTableModel");
				var aLDData = oLDModel.getProperty("/tableDataNew") || [];
				if (aLDData.length > 0) {
					var iLDLastIndex = aLDData.length - 1;
					this.byId("id_LDTable").setSelectedIndex(iLDLastIndex);
					this.onLDRowSelectionChange();
				}

				return;
			}
			// current working logic //
			else if (
				oLastRow &&
				iIndex !== iLastIndex &&
				(oLastRow.isNew || this.fn_hasUnsavedLDRow(oLastRow))
			) {
				ErrorHandler.showCustomSnackbar("Please save the current row before selecting another.", "Error", this);

				this._bRevertSelection = true;
				oTable.setSelectedIndex(iLastIndex); // triggers 2nd call, but will be ignored
				this._bRevertSelection = false;

				oTable.scrollToIndex(iLastIndex);

				// Select last row in LD table
				var oLDModel = this.getView().getModel("LDTableModel");
				var aLDData = oLDModel.getProperty("/tableDataNew") || [];
				if (aLDData.length > 0) {
					var iLDLastIndex = aLDData.length - 1;
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
			var aLDData = (oSelectedWFMainRow.Navleveldef && oSelectedWFMainRow.Navleveldef.results) || [];
			aLDData.forEach(function(entry) {
				if (entry.TypeLvl === "I") entry.TypeLvl = "Initiator";
				if (entry.TypeLvl === "R") entry.TypeLvl = "Reviewer";
				if (entry.TypeLvl === "A") entry.TypeLvl = "Approver";
				if (entry.Type === "P") entry.Type = "Parallel";
				if (entry.Type === "S") entry.Type = "Sequential";
				if (entry.Active === true) entry.Active = "True";
			});

			var oLDModel = new sap.ui.model.json.JSONModel({
				tableDataNew: aLDData
			});
			this.getView().setModel(oLDModel, "LDTableModel");

			var oLDTable = this.byId("id_LDTable");
			this._iSelectedLDIndex = undefined;
			if (oLDModel.getProperty("/tableDataNew").length > 0) {
				oLDTable.setSelectedIndex(0);

				this.onLDRowSelectionChange();
			}
		},

		onLDRowSelectionChange: function(oEvent) {
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
					if (index === iIndex && aLDData[iIndex].Lvl !== 'L0' &&
						(aLDData[iIndex].Type === 'Sequential' || aLDData[iIndex].Type === 'Parallel')) {
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
				var oPrevLDRow = oTable.getContextByIndex(this._iSelectedLDIndex).getObject();
				if (oPrevLDRow) {
					if (this._bIsAddingLDRow) {
						this._bIsAddingLDRow = false; // Reset the flag
					} else {
						if (!this.fn_isLDRowAndAgentsComplete(this._iSelectedLDIndex)) {
							oTable.setSelectedIndex(this._iSelectedLDIndex); // Revert selection
							return;
						}
					}
				}
			}

			this._iSelectedLDIndex = undefined;
			// var flag = oTable.getContextByIndex(this._iSelectedLDIndex).getObject().isNew;
			if (this._iSelectedLDIndex !== undefined && oTable.getContextByIndex(this._iSelectedLDIndex)) {

				var oPrevLDRow = oTable.getContextByIndex(this._iSelectedLDIndex).getObject();

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

			var oToday = new Date();
			var sFormattedDate = String(oToday.getDate()).padStart(2, '0') + "." +
				String(oToday.getMonth() + 1).padStart(2, '0') + "." + oToday.getFullYear();

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
		// formatter fn
		removeLeadingZeros: function(sValue) {
			if (!sValue || isNaN(sValue)) {
				return "";
			} else {
				return String(parseInt(sValue, 10));
			}
		},

		onConfirmMassCopy: function() {
			var oView = this.getView();
			var oMassInputModel = oView.getModel("MassInputModel");
			var oGroup = sap.ui.core.Fragment.byId("massFragId", "massgroup");
			var that = this;
			if (!oGroup) return;

			var iSelectedIndex = oGroup.getSelectedIndex();

			if (iSelectedIndex === 0) { // Parameter-wise
				var sAppId = (oMassInputModel.getProperty("/AppId") || "").split("-")[0].trim();

				// --- Old Values ---
				var sOldVal1 = oMassInputModel.getProperty("/WfParm1") || "";
				var sOldVal2 = oMassInputModel.getProperty("/WfParm2") || "";
				var sOldVal3 = oMassInputModel.getProperty("/WfParm3") || "";

				// --- New Values ---
				var sNewVal1 = oMassInputModel.getProperty("/NewWfParm1") || "";
				var sNewVal2 = oMassInputModel.getProperty("/NewWfParm2") || "";
				var sNewVal3 = oMassInputModel.getProperty("/NewWfParm3") || "";

				// --- Mandatory Checks ---
				if (sOldVal1 && !sNewVal1) {
					ErrorHandler.showCustomSnackbar("Please enter the new value for " + sOldVal1, "Error", this);
					return;
				}
				if (sOldVal2 && !sNewVal2) {
					ErrorHandler.showCustomSnackbar("Please enter the new value for " + sOldVal2, "Error", this);

					return;
				}
				if (sOldVal3 && !sNewVal3) {
					ErrorHandler.showCustomSnackbar("Please enter the new value for " + sOldVal3, "Error", this);
					return;
				}

				// === Agent Validations ===
				var oToday = new Date();
				oToday.setHours(0, 0, 0, 0);

				var oGDModel = oView.getModel("GDTableModel");
				var aTableData = oGDModel.getProperty("/GDTableData") || [];

				var oF4Model = oView.getModel("F4HelpAgentModel");
				var aActiveAgents = (oF4Model && oF4Model.getProperty("/List")) || [];
				var aActiveAgentIds = aActiveAgents.map(function(item) {
					return item.Value1;
				});

				for (var i = 0; i < aTableData.length; i++) {
					var oRow = aTableData[i];
					if (oRow.WfParm1 === sOldVal1) {
						var aAgents = (oRow.Navagentassign && oRow.Navagentassign.results) || [];
						for (var j = 0; j < aAgents.length; j++) {
							var oAgent = aAgents[j];
							var sAgentId = oAgent.Agent;
							var sLvl = oAgent.Lvl;

							if (String(sLvl).toUpperCase() !== "L0") {
								if (!aActiveAgentIds.includes(sAgentId)) {
									ErrorHandler.showCustomSnackbar("Agent " + sAgentId + " is not active. Mass copy not allowed.", this);

									return;
								}

								if (oAgent.EndDate) {
									var oEndDate = new Date(oAgent.EndDate);
									oEndDate.setHours(0, 0, 0, 0);
									if (oEndDate < oToday) {
										ErrorHandler.showCustomSnackbar("Agent " + sAgentId + " has expired. Mass copy not allowed.", this);

										return;
									}
								}
							}
						}
					}
				}

				// === Duplicate Check in GDTable ===
				this.fnloadFullGDDataByAppId(sAppId, function(oFullGDModel) {
					var aAllData = oFullGDModel.getProperty("/FullGDTableData") || [];

					var bDuplicate = aAllData.some(function(oItem) {
						return oItem.WfParm1 === sNewVal1;
					});

					if (bDuplicate) {
						ErrorHandler.showCustomSnackbar("Already exists in General Data Table", "Error", this);
						return;
					}

					// === Payload ===
					var oPayload = {
						AppId: sAppId,
						WfParm1From: sOldVal1,
						WfParm1To: sNewVal1,
						WfParm2From: sOldVal2,
						WfParm2To: sNewVal2,
						WfParm3From: sOldVal3,
						WfParm3To: sNewVal3,
						WfParm4From: "",
						WfParm4To: "",
						Flag: "C"
					};

					// === OData Call ===
					var oModel = that.getOwnerComponent().getModel("JMConfig");
					oModel.create("/WFCopySet", oPayload, {
						success: function() {
							ErrorHandler.showCustomSnackbar("Mass Workflow copied successfully.", "success", this);
							// sap.m.MessageToast.show("Mass Workflow copied successfully.");
							that.onCancelCopyDialog();
						}.bind(this),
						error: function(oResponse) {
							busyDialog.close();
							var sMessage = ErrorHandler.parseODataError(oResponse);
							ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
						}
					});
				});
			} else if (iSelectedIndex === 1) {

				var sFromAppId = (oMassInputModel.getProperty("/AppId")).split("-")[0].trim();
				var sToAppId = (oMassInputModel.getProperty("/ToAppId")).split("-")[0].trim();
				if (!sFromAppId || !sToAppId) {
					ErrorHandler.showCustomSnackbar("Please select both Source AppId and Target AppId.", "Error", this);
					// sap.m.MessageToast.show("Please select both Source AppId and Target AppId.");
					return;
				}

				if (sFromAppId === sToAppId) {
					ErrorHandler.showCustomSnackbar("Source and Target AppId cannot be the same.", "Error", this);
					// sap.m.MessageToast.show("Source and Target AppId cannot be the same.");
					return;
				}

				// === Payload for process-wise copy ===
				var oPayload = {
					AppId: sFromAppId,
					WfParm1From: "",
					WfParm1To: "",
					WfParm2From: "",
					WfParm2To: "",
					WfParm3From: "",
					WfParm3To: "",
					WfParm4From: "",
					WfParm4To: "",
					Flag: "C",
					ToappId: sToAppId
				};

				// === OData Call ===
				var oModel = that.getOwnerComponent().getModel("JMConfig");
				oModel.create("/WFCopySet", oPayload, {
					success: function() {
						ErrorHandler.showCustomSnackbar("Process-wise Mass Workflow copied successfully.", "success", this);
						that.onCancelCopyDialog();
					},
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}
				});
			}
		},

		onCancelCopyDialog: function() {
			if (this.pMassDialog) {
				this.pMassDialog.close();
				this.pMassDialog.destroy();
				this.pMassDialog = null;
			}
		},

		onConfirmNo: function() {
			this._bAddEnabled = false;
			this._bAddEnabledLD = false;

			if (this.Changefrag) {
				this.Changefrag.close();
				this.Changefrag.destroy();
				this.Changefrag = null;
			}

		},

		onConfirmNoChangeSearch: function() {
			if (this.ChangeSearch) {
				this.ChangeSearch.close();
				this.ChangeSearch.destroy();
				this.ChangeSearch = null;
			}

		},

		onConfirmNoMassAgent: function() {
			if (this.MassAgentfrag) {
				this.MassAgentfrag.close();
				this.MassAgentfrag.destroy();
				this.MassAgentfrag = null;
			}

		},

		onPressCopyCancel: function() {
			if (this.pCopyDialog) {
				this.pCopyDialog.close();
				this.pCopyDialog.destroy();
				this.pCopyDialog = null;
			}

		},

		onCancelDeleteDialog: function() {
			if (this.Deletefrag) {
				this.Deletefrag.close();
				this.Deletefrag.destroy();
				this.Deletefrag = null;
			}
		},

		onConfirmChangeSearch: function() {

			this.change = true;
			this._bIsEditMode = false;
			this.byId("id_LDTable").removeStyleClass("cl_maxfield");
			this.byId("id_search").setEnabled(true);
			this.byId("id_ChngeSrch").setEnabled(false);
			this.byId("id_forAgent").setEnabled(false);
			this.byId("id_saveWf").setEnabled(false);
			// this.byId("id_Mass").setEnabled(false);
			// this.byId("id_massdel").setEnabled(false);
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
			// this.byId("ID_VARIANT_INPUT").removeStyleClass("cl_chtabInput");
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
			for (var i = 0; i < aData.length; i++) {
				if (!aData[i].isNew) {
					aCleaned.push(aData[i]);
				}
			}

			oMainModel.setProperty("/tableDataGD", aCleaned);
			this.byId("id_ResultTable").clearSelection();
			this._iSelectedLDIndex = undefined;
			this._oSelectedLDRow = null;
		},

		onOpenSave: function() {
			var oInput = sap.ui.core.Fragment.byId("createVarFragId", "ID_VAR");
			var sValue = oInput.getValue().trim();

			var oModel = this.getView().getModel("WFViewModel");
			var aAllViews = oModel.getProperty("/views");

			var aSelectedViews = aAllViews.filter(function(item) {
				return item.Active === true;
			});
			var oAppInput = this.byId("WID_APPID");
			var sFullValue = oAppInput ? oAppInput.getValue().trim() : "";
			var sAppId = sFullValue.split("-")[0].trim();
			this._tempVariantData = {
				Viewid: sAppId,
				Variant: sValue,
				Views: aSelectedViews
			};

			this.fn_ConfirmSave_frag();
		},
		validateVariant: function() {
			var oView = this.getView();
			var oWFModel = oView.getModel("WFViewModel");
			var aAllViews = oWFModel.getProperty("/allViews") || [];
			var oCurrent = this._tempVariantData;

			if (!oCurrent || !oCurrent.Views || oCurrent.Views.length === 0) {
				ErrorHandler.showCustomSnackbar("Missing Views.", "Error", this);
				return false;
			}

			// selected row (edit mode)
			var sVariantName = oCurrent.Variant;
			if (this.editselection && !sVariantName) {
				sVariantName = this._selectedVariantName || "";
			}

			if (!sVariantName) {
				ErrorHandler.showCustomSnackbar("Missing Variant name.", "Error", this);
				return false;
			}
			var sAppId = oCurrent.Viewid; // use AppId from current
			var sVariantName = oCurrent.Variant;

			// Build current ViewId list and full group
			var aCurrentViewIds = [];
			var aCurrentFullGroup = [];

			for (var i = 0; i < oCurrent.Views.length; i++) {
				var oV = oCurrent.Views[i];
				aCurrentViewIds.push(oV.ViewId);
				aCurrentFullGroup.push(oV.ViewId + "|" + oV.ReadOnly + "|" + oV.Active);
			}

			aCurrentViewIds.sort();
			aCurrentFullGroup.sort();

			var sCurrentIdGroupKey = JSON.stringify(aCurrentViewIds);
			var sCurrentFullGroupKey = JSON.stringify(aCurrentFullGroup);

			// Filter allViews to only same AppId
			var aMatchingAppViews = [];
			for (var j = 0; j < aAllViews.length; j++) {
				var oViewItem = aAllViews[j];
				if (oViewItem.AppId === sAppId) {
					aMatchingAppViews.push(oViewItem);
				}
			}

			// Group views by Variant name
			var oVariantGroups = {}; // VariantName → array of views
			for (var k = 0; k < aMatchingAppViews.length; k++) {
				var oItem = aMatchingAppViews[k];
				var sVar = oItem.Variant;

				if (!oVariantGroups[sVar]) {
					oVariantGroups[sVar] = [];
				}
				oVariantGroups[sVar].push(oItem);
			}

			// Compare against each variant group
			for (var sKey in oVariantGroups) {
				var aViewsInVariant = oVariantGroups[sKey];

				// Build ID and full group
				var aOtherIds = [];
				var aOtherFullGroup = [];

				for (var x = 0; x < aViewsInVariant.length; x++) {
					var o = aViewsInVariant[x];
					aOtherIds.push(o.ViewId);
					aOtherFullGroup.push(o.ViewId + "|" + o.ReadOnly + "|" + o.Active);
				}

				aOtherIds.sort();
				aOtherFullGroup.sort();

				var sOtherIdKey = JSON.stringify(aOtherIds);
				var sOtherFullKey = JSON.stringify(aOtherFullGroup);

				if (sOtherIdKey === sCurrentIdGroupKey && sOtherFullKey === sCurrentFullGroupKey) {
					ErrorHandler.showCustomSnackbar("Same view group already exists under variant: " + sKey, "Error", this);

					return false;
				}
			}

			return true;
		},
		fn_ConfirmSave_frag: function(oEvent) {
			if (!this.validateVariant()) {
				return;
			}
			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you sure you want to save?",
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "VariantSave"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();

		},
		onDeleteVariant: function() {
			var oModel = this.getView().getModel("WFViewModel");
			var aVariants = oModel.getProperty("/variants");

			var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
			var iSelectedIndex = oTable.getSelectedIndex();

			if (iSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please select a variant to delete.", "Error", this);
				return;
			}

			var oContext = oTable.getContextByIndex(iSelectedIndex);
			var oSelectedData = oContext.getObject();
			if (oSelectedData.Variant === "COMMON") {
				ErrorHandler.showCustomSnackbar("Cannot Delete Common Variant", "Error", this);
				return;
			}
			this.fn_Deletevar_frag();
		},
		fn_Deletevar_frag: function(oEvent) {
			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you sure you want to delete?",
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "VariantDelete"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();

		},
		onDeleteSelectedVariants: function() {
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
			var iSelectedIndex = oTable.getSelectedIndex();
			var oContext = oTable.getContextByIndex(iSelectedIndex);
			var oSelectedData = oContext.getObject();
			var oPayload = {
				AppId: sAppId,
				Variant: oSelectedData.Variant,
				Flag: "D",
				Navvariant: []
			};
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var that = this;

			oModel.create("/WFVariantSet", oPayload, {
				success: function(oData) {
					// Check if Navvariant exists and has a Response message
					var aNavVariant = oData.Navvariant || [];

					if (aNavVariant.results && aNavVariant.results.length > 0 && aNavVariant.results[0].Response) {
						ErrorHandler.showCustomSnackbar(aNavVariant.results[0].Response, "success", that);

					} else {
						ErrorHandler.showCustomSnackbar("Variant Deleted Successfully", "success", that);

						that.fngetvar();
					}

					// Close the confirmation dialog
					if (that.ConfirmDelVar) {
						that.ConfirmDelVar.close();
						that.ConfirmDelVar.destroy();
						that.ConfirmDelVar = null;
					}
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}
			});
			if (this.ConfirmDelVar) {
				this.ConfirmDelVar.close();
				this.ConfirmDelVar.destroy();
				this.ConfirmDelVar = null;
			}
		},
		formatDate: function(oDate) {
			if (!oDate) return "";

			var dateObj = new Date(oDate);
			if (isNaN(dateObj)) return "";

			var day = String(dateObj.getDate()).padStart(2, '0');
			var month = String(dateObj.getMonth() + 1).padStart(2, '0');
			var year = dateObj.getFullYear();

			return day + "." + month + "." + year;
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
				var sAppId = this.getView().byId("WID_APPID").getValue().trim();
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
								this.fn_getMassAppid(oEvent);
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
							// valueHelpRequest: this.fngetAgent.bind(this)
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
								// this._oF4SourceInput = oEvent.getSource();
								this.fngetAppidmassAgent(oEvent);
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

		fn_massAgentChange: function() {
			var oView = this.getView();
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
					ErrorHandler.showCustomSnackbar("Mass Agent Change successful.", "success", this);

					that.fn_massAgentCancel();
					that.fnSaveGdBehaviour();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},
		fn_massAgentCancel: function() {
			if (this.MassAgentfrag) {
				this.MassAgentfrag.close();
				this.MassAgentfrag.destroy();
				this.MassAgentfrag = null;
			}
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
		onVariantRowSelection: function(oEvent) {
			//  Check if variant input field has any value — block selection if so
			var oInput = sap.ui.core.Fragment.byId("createVarFragId", "ID_VAR");
			var sInputVal = oInput ? oInput.getValue().trim() : "";
			if (sInputVal) {
				var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
				if (oTable) {
					oTable.setSelectedIndex(-1);
				}
				return;
			}

			//  If edit is in progress, confirm before switching selection
			if (this.editselection) {
				this._pendingVariantSelection = oEvent;

				this._pendingVariantSelection = oEvent;
				this._openConfirmExitEditDialog();
				return;
			}

			//  Proceed with normal row selection logic
			this._handleVariantRowSelection(oEvent);
		},
		_handleVariantRowSelection: function(oEvent) {
			var oContext = oEvent.getParameter("rowContext");
			if (!oContext) {
				return;

			}

			var oSelectedRow = oContext.getObject();
			var sVariant = oSelectedRow && oSelectedRow.Variant;
			if (!sVariant) {
				return;
			}

			var oView = this.getView();
			var oViewModel = oView.getModel("WFViewModel");

			if (!oViewModel) {
				return;
			}

			var aAllViews = oViewModel.getProperty("/allViews") || [];
			var aUniqueVariants = oViewModel.getProperty("/variants") || [];

			var vVariantValue = sVariant;

			var vAllViewBind = [];
			var vAllView = this.getView().getModel('WFVariableModel').getData();
			var vMergedArray = vAllView.map(function(oItemView) {
				var oMatch = aAllViews.find(function(oItemMacth) {

					return vVariantValue === oItemMacth.Variant && oItemView.ViewName === oItemMacth.ViewName;

				});

				if (oMatch) {
					vAllViewBind.push({
						ViewId: oItemView.ViewId,
						ViewName: oItemView.ViewName,

						ReadOnly: oMatch.ReadOnly,
						Active: oMatch.Active,
						Editable: false

					});
				} else {
					vAllViewBind.push({
						ViewId: oItemView.ViewId,
						ViewName: oItemView.ViewName,

						ReadOnly: false,
						Active: false,
						Editable: false
					});
				}
			});

			var oViewModel = new sap.ui.model.json.JSONModel({
				allViews: aAllViews,
				views: vAllViewBind,
				variants: aUniqueVariants
			});

			this.getView().setModel(oViewModel, "WFViewModel");

			var oTable = this.byId("idVariantsTable");
			if (oTable) {
				oTable.getBinding("rows").refresh();
			}
		},
		_openConfirmExitEditDialog: function() {
			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "You are currently editing. Do you want to discard changes?",
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "VariantEditExit"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},

		onConfirmExitYes: function() {
			this.editselection = false;
			// this._oConfirmExitDialog.close();

			if (this._pendingVariantSelection) {
				var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
				var oRowContext = this._pendingVariantSelection.getParameter("rowContext");

				if (oTable && oRowContext) {
					var oBinding = oTable.getBinding("rows");

					// Get index of the selected context in the full data model
					var iIndex = oBinding.getContexts(0, oBinding.getLength()).findIndex(function(context) {
						return context.getPath() === oRowContext.getPath();
					});

					if (iIndex !== -1) {
						oTable.setSelectedIndex(iIndex); // Ensure visual selection
					}
				}

				this._handleVariantRowSelection(this._pendingVariantSelection);
				this._pendingVariantSelection = null;
			}
		},
		onConfirmExitNo: function() {
			var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
			oTable.setSelectedIndex(this._previousSelectedIndex);
			this._oConfirmExitDialog.close();
		},

		onVariantSearch: function(oEvent) {
			var sQuery = oEvent.getParameter("newValue").trim();
			var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");

			if (!sQuery || !oTable) {
				return;
			}

			var oModel = oTable.getModel("WFViewModel");
			var aVariants = oModel.getProperty("/variants") || [];

			for (var i = 0; i < aVariants.length; i++) {
				if (aVariants[i].Variant && aVariants[i].Variant.toLowerCase().includes(sQuery.toLowerCase())) {
					oTable.setSelectedIndex(i);

					var oContext = oTable.getContextByIndex(i);
					if (oContext) {
						this.onVariantRowSelection({
							getParameter: function(paramName) {
								return paramName === "rowContext" ? oContext : null;
							}
						});
						// Move cursor (focus) to the selected row (1st cell)
						setTimeout(function() {
							oTable.setFirstVisibleRow(i);
							oTable.setSelectedIndex(i);
						}, 100);

					}

					oTable.scrollToIndex(i);
					return;
				}
			}

			oTable.clearSelection();
		},
		onVariantOpen: function(oEvent) {
			this._oCallingInput = oEvent.getSource();
			var oModel = this.getView().getModel("JMConfig");

			var oAppInput = this.byId("WID_APPID");
			var sFullValue = oAppInput ? oAppInput.getValue().trim() : "";
			var sAppId = sFullValue.split("-")[0].trim();

			oModel.read("/WFViewSet", {
				filters: [new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)],
				success: function(oData) {
					var aAllViews = oData.results;

					var aUniqueVariants = [];
					var oSeen = {};

					aAllViews.forEach(function(item) {
						if (!oSeen[item.Variant]) {
							oSeen[item.Variant] = true;
							aUniqueVariants.push({
								Variant: item.Variant
							});
						}
					});

					var oViewModel = new sap.ui.model.json.JSONModel({
						allViews: aAllViews,
						variants: aUniqueVariants
					});

					this.getView().setModel(oViewModel, "WFViewModel");
					if (aUniqueVariants.length > 0) {
						this._oSelectedVariant = aUniqueVariants[0]; // Store first row
						this._bVariantExplicitlySelected = true; // Treat as explicitly selected
						// Filter views for the selected variant
						var sSelectedVariant = this._oSelectedVariant.Variant;
						var aFilteredViews = aAllViews.filter(function(view) {
							return view.Variant === sSelectedVariant;
						});

						// Update only views for right table
						oViewModel.setProperty("/views", aFilteredViews);
					}
					var oTable = sap.ui.core.Fragment.byId("SelectVarFragId", "idVariantTable");
					oTable.setSelectedIndex(0);
				}.bind(this),
				error: function(oError) {}
			});

			this.fn_SelectVar_frag();
		},
		fn_SelectVar_frag: function(oEvent) {

			if (!this.SearchVarfrag) {
				this.SearchVarfrag = sap.ui.xmlfragment("SelectVarFragId", "WorkflowRules.fragment.variant", this);
				this.getView().addDependent(this.SearchVarfrag);
			}
			this.SearchVarfrag.open();

		},
		onConfirmVariantSelection: function() {
			var oTable = sap.ui.core.Fragment.byId("SelectVarFragId", "idVariantTable");
			var iSelectedIndex = oTable.getSelectedIndex();

			if (iSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please select a variant.", "Error", this);
				// sap.m.MessageToast.show();
				return;
			}

			var oContext = oTable.getContextByIndex(iSelectedIndex);
			var sSelectedVariant = oContext.getProperty("Variant");

			// Set it back to the Input field
			if (this._oCallingInput) {
				this._oCallingInput.setValue(sSelectedVariant);
			}

			// Close the dialog
			if (this.SearchVarfrag) {
				this.SearchVarfrag.close();
			}
			this._checkMinApprCompletion();
		},
		onCancelSelectVar: function() {
			if (this.SearchVarfrag) {
				this.SearchVarfrag.close();
				this.SearchVarfrag.destroy();
				this.SearchVarfrag = null;
			}

		},
		onEndDateChange: function(oEvent) {
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
				var oRow = oModel.getProperty(sPath);
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
				var oRow = oModel.getProperty(sPath);
				oRow.EndDate = "";
				oModel.setProperty(sPath, oRow);
				return;
			}

			// Format to dd.MM.yyyy and set in model
			var sFormattedDate = String(oDate.getDate()).padStart(2, '0') + "." +
				String(oDate.getMonth() + 1).padStart(2, '0') + "." +
				oDate.getFullYear();

			var oRow = oModel.getProperty(sPath);
			oRow.EndDate = sFormattedDate;
			oModel.setProperty(sPath, oRow);

			// Set formatted date in the input field manually (important)
			oDatePicker.setValue(sFormattedDate);

			this._checkMinApprCompletion();
		},

		onVariantRowSelection1: function(oEvent) {
			var oContext = oEvent.getParameter("rowContext");
			if (!oContext) return;

			var oSelectedRow = oContext.getObject();
			var sVariant = oSelectedRow && oSelectedRow.Variant;
			if (!sVariant) return;

			this._oSelectedVariant = oSelectedRow;
			this._bVariantExplicitlySelected = true;

			var oView = this.getView();
			var oViewModel = oView.getModel("WFViewModel");
			if (!oViewModel) return;

			var aAllViews = oViewModel.getProperty("/allViews") || [];
			var aUniqueVariants = oViewModel.getProperty("/variants") || [];

			var vAllViewBind = [];
			var vAllView = this.getView().getModel('WFVariableModel').getData();

			vAllView.forEach(function(oItemView) {
				var oMatch = aAllViews.find(function(oItemMatch) {
					return sVariant === oItemMatch.Variant && oItemView.ViewName === oItemMatch.ViewName;
				});

				if (oMatch) {
					vAllViewBind.push({
						ViewId: oItemView.ViewId,
						ViewName: oItemView.ViewName,
						ReadOnly: oMatch.ReadOnly,
						Active: oMatch.Active,
						Editable: false
					});
				} else {
					vAllViewBind.push({
						ViewId: oItemView.ViewId,
						ViewName: oItemView.ViewName,
						ReadOnly: false,
						Active: false,
						Editable: false
					});
				}
			});

			var oUpdatedModel = new sap.ui.model.json.JSONModel({
				allViews: aAllViews,
				views: vAllViewBind,
				variants: aUniqueVariants
			});

			this.getView().setModel(oUpdatedModel, "WFViewModel");

			var oTable = this.byId("idVariantsTable");
			if (oTable) {
				oTable.getBinding("rows").refresh();
			}
		},
		onokselect: function() {
			if (!this._bVariantExplicitlySelected || !this._oSelectedVariant) {
				ErrorHandler.showCustomSnackbar("Please select a variant.", "Error", this);
				return;
			}

			var sVariant = this._oSelectedVariant.Variant;

			// Set value to input field
			if (this._oCallingInput && typeof this._oCallingInput.setValue === "function") {
				this._oCallingInput.setValue(sVariant);
				this._oCallingInput.fireChange({
					value: sVariant
				});
			}

			// Update variant model state (mark selected one as active)
			var oVariableModel = this.getView().getModel("WFVariableModel");
			if (oVariableModel) {
				var aAllVariants = oVariableModel.getProperty("/variants") || [];
				aAllVariants.forEach(function(variant) {
					variant.Active = (variant.Variant === sVariant);
				});
				oVariableModel.setProperty("/variants", aAllVariants);
				oVariableModel.refresh(true);
			}

			// Close dialog
			this._oSelectedVariant = null;
			this._bVariantExplicitlySelected = false;
			this._oCallingInput = null;
			this.SearchVarfrag.close();
			this._checkMinApprCompletion();
		},

		onSaveWorkflowData: function() {

			var that = this;
			// this.byId("id_Mass").setEnabled(true);
			this.byId("id_Copy").setEnabled(true);
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var oLDModel = this.getView().getModel("LDTableModel");
			var aLDData = oLDModel.getProperty("/tableDataNew") || [];

			if (!aLDData.length) {
				ErrorHandler.showCustomSnackbar("No data to save.", "Error", this);
				// sap.m.MessageToast.show();
				return;
			}

			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();
			var oTable = this.byId("id_ResultTable");
			var iSelectedIndex = oTable.getSelectedIndex();
			if (iSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please select a row in the table.", "Error", this);
				// sap.m.MessageToast.show();
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

			function convertUIHrsToBackend(sTime) {
				if (!sTime) return null;
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
					// sap.m.MessageToast.show("Workflow saved successfully.");
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

		onsaveVariant: function() {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var aSourceDataAgent = this.getView().getModel("AATableModel").getProperty("/variants");
			var oPayload = {
				AppId: "MC",
				ViewId: "ID_MMA1"
			};
			aSourceDataAgent.forEach(function(varTab) {
				oPayload.push({
					Variant: varTab.Variant,
					ViewName: varTab.ViewName,
				});
			});
			oModel.create("/WFViewSet", oPayload, {
				success: function() {
					ErrorHandler.showCustomSnackbar("Workflow saved successfully.", "success", this);

				},
				error: function(oResponse) {

					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);

				}.bind(this)
			});
		},

		onModifyvariant: function() {
			this.editselection = true;

			var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
			var iSelectedIndex = oTable.getSelectedIndex();
			this._previousSelectedIndex = iSelectedIndex;
			if (iSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please select a variant to edit.", "Error", this);
				return;
			}

			var oContext = oTable.getContextByIndex(iSelectedIndex);
			if (!oContext) return;

			var oSelectedRow = oContext.getObject();
			var sVariant = oSelectedRow && oSelectedRow.Variant;
			this._selectedVariantName = sVariant;
			if (!sVariant) return;

			//  Prevent editing if variant is COMMON
			if (sVariant.toUpperCase() === "COMMON") {
				ErrorHandler.showCustomSnackbar("Editing the COMMON variant is not allowed.", "Error", this);
				this.editselection = false;
				return;
			}

			var oViewModel = this.getView().getModel("WFViewModel");
			var aViews = oViewModel.getProperty("/views") || [];

			aViews.forEach(function(view) {
				view.Editable = true;
			});

			oViewModel.setProperty("/views", aViews);
			oViewModel.setProperty("/Editable", true);
			oViewModel.refresh(true);
		},
		onReadOnlySelect: function(oEvent) {
			var oCheckbox = oEvent.getSource();
			var bSelected = oCheckbox.getSelected();
			var oContext = oCheckbox.getBindingContext("WFViewModel");

			if (!oContext) return;

			var oRowData = oContext.getObject();

			// If ReadOnly is selected, ensure Active is also selected
			if (bSelected) {
				oRowData.Active = true;
				oContext.getModel().setProperty(oContext.getPath(), oRowData);
				oContext.getModel().refresh(true);
			}
		},
		onChangeVar: function(oEvent) {
			var oInput = oEvent.getSource();
			var sValue = oInput.getValue().trim();
			var sUpper = sValue.toUpperCase();
			oInput.setValue(sUpper);

			var oViewModel = this.getView().getModel("WFViewModel");
			var aViews = oViewModel.getProperty("/views") || [];
			// var validPattern = /^[A-Z0-9]+$/;
			var validPattern = /^[A-Z]+$/;
			if (sUpper !== "" && !validPattern.test(sUpper)) {
				// sap.m.MessageToast.show("Only letters and numbers are allowed.");
				this.EnableCreate = false;

				oInput.setValueState(sap.ui.core.ValueState.Error);
				oInput.setValueStateText("No special characters or numbers is  allowed");
				aViews.forEach(function(view) {
					view.Active = false;
					view.ReadOnly = false;
					view.Editable = false;
				});
				oViewModel.setProperty("/views", aViews);
				return;
			} else {
				oInput.setValueState(sap.ui.core.ValueState.None);
			}

			// Minimum length check
			if (sUpper.length < 2) {
				ErrorHandler.showCustomSnackbar("Please enter at least 2 characters.", "Error", this);
				this.EnableCreate = false;

				aViews.forEach(function(view) {
					view.Active = false;
					view.ReadOnly = false;
					view.Editable = false;
				});
				oViewModel.setProperty("/views", aViews);
				return;
			}

			if (this.isVariantDuplicate(sUpper)) {
				// sap.m.MessageToast.show("Variant already exists.");
				this.EnableCreate = false;

				oInput.setValueState(sap.ui.core.ValueState.Error);
				oInput.setValueStateText("Duplicate variant name");
				aViews.forEach(function(view) {
					view.Active = false;
					view.ReadOnly = false;
					view.Editable = false;
				});
				oViewModel.setProperty("/views", aViews);

				return;
			} else {
				oInput.setValueState(sap.ui.core.ValueState.None);
			}

			// Enable creation
			this.EnableCreate = true;

			aViews.forEach(function(view) {
				view.isActiveEditable = true;
				view.Active = false;
				view.ReadOnly = false;
				view.Editable = true;
			});
			oViewModel.setProperty("/views", aViews);

			// Reset selection logic
			var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
			if (sUpper === "" && oTable) {
				var oBinding = oTable.getBinding("rows");
				if (oBinding && oBinding.getLength() > 0) {
					oTable.setSelectedIndex(0);
					var oContext = oTable.getContextByIndex(0);
					if (oContext) {
						this.onVariantRowSelection({
							getParameter: function() {
								return oContext;
							}
						});
					}
				}
			} else if (oTable) {
				oTable.setSelectedIndex(-1); // deselect
			}

			this.value = sValue;
			this.hasResetOnce = false;
		},
		isVariantDuplicate: function(sValue) {
			var oViewModel = this.getView().getModel("WFViewModel");
			var aVariants = oViewModel.getProperty("/variants") || [];

			return aVariants.some(function(variant) {
				return variant.Variant === sValue;
			});
		},
		onChangeVariantName: function(oEvent) {
			var sVariant = oEvent.getSource().getValue().trim().toUpperCase();
			var oWFModel = this.getView().getModel("WFViewModel");
			var aVariants = oWFModel.getProperty("/variants") || [];

			var oAppInput = this.byId("WID_APPID");
			var sAppId = (oAppInput && oAppInput.getValue().trim().split("-")[0]) || "";

			var bDuplicate = aVariants.some(function(v) {
				return v.AppId === sAppId && v.Variant === sVariant;
			});

			if (bDuplicate) {
				ErrorHandler.showCustomSnackbar("Variant name already exists under the same App ID.", "Error", this);
				this.EnableCreate = false;
			} else {
				this.EnableCreate = true;
			}
		},

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
				"PVMC") || sAppId.startsWith("BX") || sAppId.startsWith("RX") || sAppId.startsWith("PHC") || sAppId.startsWith("PHX")|| sAppId.startsWith("PM") ||
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
		onVariantF4Open: function(oEvent) {
			this._oVariantF4Input = oEvent.getSource();

			if (!this._oVariantF4Dialog) {
				this._oVariantF4Dialog = sap.ui.xmlfragment("WorkflowRules.fragment.VariantF4Dialog", this);
				this.getView().addDependent(this._oVariantF4Dialog);
			}

			this._oVariantF4Dialog.open();
		},
		onVariantF4Search: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = [
				new sap.ui.model.Filter("Variant", sap.ui.model.FilterOperator.Contains, sValue),

			];

			var oBinding = oEvent.getSource().getBinding("items");
			var oFinalFilter = new sap.ui.model.Filter(oFilter, false);
			oBinding.filter(oFinalFilter);
		},

		onVariantF4Confirm: function(oEvent) {
			var oInput = sap.ui.core.Fragment.byId("createVarFragId", "ID_VAR");
			oInput.setValue("");
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem && this._oVariantF4Input) {
				var sVariant = oSelectedItem.getTitle();
				this._oVariantF4Input.setValue(sVariant);
				this._oVariantF4Input.fireChange({
					value: sVariant
				});

				// Optional: auto-select matching row in left table
				var oTable = sap.ui.core.Fragment.byId("createVarFragId", "idVariantTable");
				if (oTable) {
					var oBinding = oTable.getBinding("rows");
					var aData = oBinding ? oBinding.getModel().getProperty(oBinding.getPath()) : [];
					var iIndex = aData.findIndex(function(o) {
						return o.Variant === sVariant;
					});
					if (iIndex !== -1) {
						oTable.setSelectedIndex(iIndex);
						oTable.setFirstVisibleRow(iIndex);
						var oContext = oTable.getContextByIndex(iIndex);
						this.onVariantRowSelection({
							getParameter: function() {
								return oContext;
							}
						});
					}
				}
			}
			this._oVariantF4Input = null;
		},
		onVariantF4Cancel: function() {
			this._oVariantF4Input = null;
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
		// checking inprogress status
		fn_checkUnsavedNewRows: function() {
			var oView = this.getView();
			var aModelsToCheck = [{
				model: "AATableModel",
				path: "/tableDataAA"
			}, {
				model: "LDTableModel",
				path: "/tableDataNew"
			}, {
				model: "GDTableModel",
				path: "/GDTableData"
			}];

			return aModelsToCheck.some(function(entry) {
				var oModel = oView.getModel(entry.model);
				if (!oModel) return false;

				var aRows = oModel.getProperty(entry.path) || [];
				return aRows.some(function(row) {
					return row.isNew === true;
				});
			});
		},
		fn_openUnsavedConfirmFragment: function() {
			var oConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you Sure Unsaved Changes Detected?",
				submitText: "Yes",
				cancelText: "No",
				submitIcon: "Apply.svg",
				cancelIcon: "Cancel.svg",
				action: "Unsaved"
			});
			this.getView().setModel(oConfirmModel, "CONFIRM_MODEL");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Confirmation", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();

		},
		onConfirmProceed: function() {

			this.fn_removeUnsavedRowsFromAllModels();
			this.fngetvar();

			var oTable = this.byId("id_ResultTable");
			oTable.setSelectedIndex(0);

		},
		fn_removeUnsavedRowsFromAllModels: function() {
			var oView = this.getView();

			var aModelsToClean = [{
				model: "AATableModel",
				path: "/tableDataAA"
			}, {
				model: "GDTableModel",
				path: "/GDTableData"
			}, {
				model: "LDTableModel",
				path: "/tableDataNew"
			}];

			aModelsToClean.forEach(function(entry) {
				var oModel = oView.getModel(entry.model);
				if (!oModel) return;

				var aData = oModel.getProperty(entry.path) || [];
				var aFiltered = aData.filter(function(oRow) {
					return oRow.isNew !== true;
				});

				oModel.setProperty(entry.path, aFiltered);
			});
		},
		// Level and Agent Completion check when level row selection

		fn_isLDRowAndAgentsComplete: function(iRowIndexToValidate) {
			var oView = this.getView();
			var oLDTable = oView.byId("id_LDTable");
			var oLDModel = oView.getModel("LDTableModel");
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
				sAppId.startsWith("BX") || sAppId.startsWith("RX") || sAppId.startsWith("PHC") || sAppId.startsWith("PHX") || sAppId.startsWith("PM") ||
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
				sAppId.startsWith("BX") || sAppId.startsWith("RX") || sAppId.startsWith("PHC") || sAppId.startsWith("PHX") || sAppId.startsWith("PM") ||
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

		onEmailPress: function(oEvent) {
			if (!this.emailfrag) {
				this.emailfrag = sap.ui.xmlfragment("emailFragId", "WorkflowRules.fragment.emailDialog", this);
				this.getView().addDependent(this.emailfrag);
			}

			var oImage = oEvent.getSource();
			var oLDContext = oImage.getBindingContext("LDTableModel");
			if (!oLDContext) return;

			var oLDData = oLDContext.getObject();
			var oResultTable = this.byId("id_ResultTable");
			var iIndex = oResultTable.getSelectedIndex();
			if (iIndex < 0) {
				ErrorHandler.showCustomSnackbar("Please select a row in the table first.", "Error", this);
				return;
			}

			var oRowData = oResultTable.getContextByIndex(iIndex).getObject();
			var sAppId = this.byId("WID_APPID").getValue().split("-")[0].trim();

			var oPayload = {
				AppId: sAppId,
				WfParm1: oRowData.WfParm1 || "",
				WfParm2: oRowData.WfParm2 || "",
				WfParm3: oRowData.WfParm3 || "",
				WfParm4: oRowData.WfParm4 || "",
				Lvl: oLDData.Lvl,
				Flag: "G",
				Navmail: []

			};
			var sKey = [
				oPayload.Lvl,
				oPayload.WfParm1,
				oPayload.WfParm2,
				oPayload.WfParm3,
				oPayload.WfParm4
			].join("|");

			if (!this._emailMap) {
				this._emailMap = {};
			}

			var that = this;
			if (!this._emailMap[sKey] || this._emailMap[sKey].length === 0) {
				var oModel = this.getOwnerComponent().getModel("JMConfig");
				oModel.create("/WFMailSet", oPayload, {
					success: function(oData) {
						that._emailMap[sKey] = oData.Navmail.results || [];
						that.fn_openEmailDialog(oPayload, sKey);
					},
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}
				});
			} else {
				this.fn_openEmailDialog(oPayload, sKey);
			}
		},

		fn_openEmailDialog: function(oPayload, sKey) {
			var oEmailModel = new sap.ui.model.json.JSONModel({
				EmailList: this._emailMap[sKey]
			});
			var oInputModel = new sap.ui.model.json.JSONModel(oPayload);

			this.emailfrag.setModel(oInputModel, "InputModel");
			this.emailfrag.setModel(oEmailModel, "EmailList");

			this._emailContext = oPayload;
			this._emailContext._cacheKey = sKey;

			this.emailfrag.open();

			var bEnable = (this.emailflag === true);
			sap.ui.core.Fragment.byId("emailFragId", "id_Savemail").setEnabled(bEnable);
			sap.ui.core.Fragment.byId("emailFragId", "id_mail").setEnabled(bEnable);
			sap.ui.core.Fragment.byId("emailFragId", "id_delemail").setEnabled(bEnable);
			sap.ui.core.Fragment.byId("emailFragId", "ID_SLAREMDATE").setEnabled(bEnable);
			sap.ui.core.Fragment.byId("emailFragId", "ID_SLAREMTIME").setEnabled(bEnable);
			sap.ui.core.Fragment.byId("emailFragId", "ID_SLAESCDATE").setEnabled(bEnable);
			sap.ui.core.Fragment.byId("emailFragId", "ID_SLAESCTIME").setEnabled(bEnable);
			sap.ui.core.Fragment.byId("emailFragId", "ID_EMAILCOMBOBOX").setEnabled(bEnable);
			sap.ui.core.Fragment.byId("emailFragId", "ID_EXTAPR").setEnabled(bEnable);
			this.emailfrag.getModel("InputModel").setProperty("/isEnabled", bEnable);
		},

		fnaddEmail: function() {
			var oInput = sap.ui.core.Fragment.byId("emailFragId", "id_mail");
			var sEmail = oInput.getValue().trim();
			var sKey = this._emailContext._cacheKey;

			if (!this._emailMap[sKey]) {
				this._emailMap[sKey] = [];
			}

			var aData = this._emailMap[sKey];
			var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

			if (!sEmail) {
				ErrorHandler.showCustomSnackbar("Please enter an email address.", "Error", this);
				return;
			}
			if (!emailRegex.test(sEmail)) {
				oInput.setValueState("Error");
				oInput.setValueStateText("Invalid email format.");
				ErrorHandler.showCustomSnackbar("Invalid email format", "Error", this);
				return;
			}
			oInput.setValueState("None");

			var allowedDomains = ["gmail.com", "exalca.com"];
			var sDomain = sEmail.split("@")[1].toLowerCase();
			if (!allowedDomains.includes(sDomain)) {
				oInput.setValueState("Error");
				oInput.setValueStateText("Only gmail.com and exalca.com emails are allowed.");
				ErrorHandler.showCustomSnackbar("Only gmail.com and exalca.com emails are allowed.", "Error", this);
				return;
			}

			if (aData.some(function(item) {
					return item.MailId === sEmail;
				})) {
				ErrorHandler.showCustomSnackbar("This email already exists.", "Error", this);
				return;
			}
			var oNewMail = jQuery.extend({}, this._emailContext, {
				MailId: sEmail,
				__isNew: true
			});
			aData.push(oNewMail);
			this.emailfrag.getModel("EmailList").setProperty("/EmailList", aData);
			oInput.setValue("");
			ErrorHandler.showCustomSnackbar("Email added successfully", "success", this);
		},

		fnsingleRemoveEmail: function(oEvent) {
			var oContext = oEvent.getSource().getBindingContext("EmailList");
			if (!oContext) {
				ErrorHandler.showCustomSnackbar("Unable to determine email to delete.", "Error", this);
				return;
			}

			var oDeletedMail = oContext.getObject();
			var oModel = this.emailfrag.getModel("EmailList");
			var aData = oModel.getProperty("/EmailList") || [];

			var that = this;
			sap.m.MessageBox.confirm("Are you sure you want to delete this email?", {
				styleClass: "cl_emailcancel",
				onClose: function(sAction) {
					if (sAction === "OK") {
						// Filter email out
						var aFiltered = [];
						for (var i = 0; i < aData.length; i++) {
							if (aData[i].MailId !== oDeletedMail.MailId) {
								aFiltered.push(aData[i]);
							}
						}

						// Update model
						oModel.setProperty("/EmailList", aFiltered);

						// Also update _emailMap to persist across reopen
						var sLvl = oDeletedMail.Lvl;
						if (!that._emailMap) {
							that._emailMap = {};
						}
						that._emailMap[sLvl] = aFiltered;

						// Case 1: Email is new 
						if (oDeletedMail.__isNew) {
							sap.m.MessageToast.show("Email removed.");
							return;
						}

						// Case 2: Email is saved 
						var oPayload = {
							AppId: oDeletedMail.AppId,
							WfParm1: oDeletedMail.WfParm1,
							WfParm2: oDeletedMail.WfParm2,
							WfParm3: oDeletedMail.WfParm3,
							WfParm4: oDeletedMail.WfParm4,
							Lvl: oDeletedMail.Lvl,
							Flag: "D",
							Navmail: [oDeletedMail]
						};

						that.getOwnerComponent().getModel("JMConfig").create("/WFMailSet", oPayload, {
							success: function() {
								ErrorHandler.showCustomSnackbar("Email deleted Successfully", "success", this);
							},
							error: function(oResponse) {
								busyDialog.close();
								var sMessage = ErrorHandler.parseODataError(oResponse);
								ErrorHandler.showCustomSnackbar(sMessage, "Error", this);

							}.bind(this)
						});
					}
				}
			});
		},
		fnRemoveEmail: function(oEvent) {
			// var oTable = this.byId("id_emailtable");
			var oTable = sap.ui.core.Fragment.byId("emailFragId", "id_emailtable");
			var aSelectedIndices = oTable.getSelectedIndices();

			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar("Please select at least one email to delete.", "Error", this);

				return;
			}

			var oModel = this.emailfrag.getModel("EmailList");
			var aData = oModel.getProperty("/EmailList") || [];
			var aSelectedEmails = [];

			for (var i = 0; i < aSelectedIndices.length; i++) {
				var oContext = oTable.getContextByIndex(aSelectedIndices[i]);
				if (oContext) {
					aSelectedEmails.push(oContext.getObject());
				}
			}

			var that = this;
			sap.m.MessageBox.confirm("Are you sure you want to delete the selected emails?", {
				onClose: function(sAction) {
					if (sAction !== "OK") return;

					// Filter out selected emails
					var aFiltered = [];
					for (var i = 0; i < aData.length; i++) {
						var bMatch = false;
						for (var j = 0; j < aSelectedEmails.length; j++) {
							if (aData[i].MailId === aSelectedEmails[j].MailId) {
								bMatch = true;
								break;
							}
						}
						if (!bMatch) {
							aFiltered.push(aData[i]);
						}
					}

					oModel.setProperty("/EmailList", aFiltered);

					// Update _emailMap
					if (!that._emailMap) that._emailMap = {};
					if (aSelectedEmails.length > 0) {
						that._emailMap[aSelectedEmails[0].Lvl] = aFiltered;
					}

					// Split into new and saved
					var aNew = [],
						aSaved = [];
					for (var k = 0; k < aSelectedEmails.length; k++) {
						if (aSelectedEmails[k].__isNew) {
							aNew.push(aSelectedEmails[k]);
						} else {
							aSaved.push(aSelectedEmails[k]);
						}
					}

					if (aNew.length > 0) {
						ErrorHandler.showCustomSnackbar("Email removed", "success", this);

					}

					if (aSaved.length > 0) {
						var oPayload = {
							AppId: aSaved[0].AppId,
							WfParm1: aSaved[0].WfParm1,
							WfParm2: aSaved[0].WfParm2,
							WfParm3: aSaved[0].WfParm3,
							WfParm4: aSaved[0].WfParm4,
							Lvl: aSaved[0].Lvl,
							Flag: "D",
							Navmail: aSaved
						};

						that.getOwnerComponent().getModel("JMConfig").create("/WFMailSet", oPayload, {
							success: function() {
								ErrorHandler.showCustomSnackbar("Email deleted Successfully.", "success", this);

							},
							error: function() {
								busyDialog.close();
								var sMessage = ErrorHandler.parseODataError(oResponse);
								ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
							}
						});
					}

					// Clear table selection
					oTable.clearSelection();
				}
			});
		},
		onEmailDialogClose: function() {
			this.fn_loadsladata();
			if (this.emailfrag) {
				this.emailfrag.close();
				this.emailfrag.destroy();
				this.emailfrag = null;
			}
		},
		onEmailLiveChange: function(oEvent) {
			var oInput = sap.ui.core.Fragment.byId("emailFragId", "id_mail");
			oInput.setValueState("None");
			oInput.setValueStateText("");
		},

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

					var iRowCount = Math.min(aResults.length, 11);
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
						if (that._iPrevLevelIndex >= 0) that.onLDSelectionChange();
						if (that._iPrevAgentIndex >= 0) that.onAgentSelectionChange();
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
		fn_hasUnsavedLDRow: function(oWFRow) {
			var aLDLevels = (oWFRow.Navleveldef && oWFRow.Navleveldef.results) || [];
			return aLDLevels.some(function(ld) {
				return ld.isNew || !ld.Lvl || ld.Lvl.trim() === "";
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
		fnloadFullGDDataByAppId: function(sAppId, fnCallback) {
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var aFilter = [
				new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)
			];

			oModel.read("/WFMainSet", {
				filters: aFilter,
				urlParameters: {
					"$expand": "Navleveldef,Navagentassign"
				},
				success: function(oData) {
					var aResults = oData.results || [];

					var oFullGDModel = new sap.ui.model.json.JSONModel({
						FullGDTableData: aResults
					});

					if (typeof fnCallback === "function") {
						fnCallback(oFullGDModel);
					}
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},
		onDeptChange: function(oEvent) {
			var oComboBox = oEvent.getSource();
			var sEnteredText = oComboBox.getValue();
			var oContext = oComboBox.getBindingContext("LDTableModel");
			if (!oContext) return;

			var aItems = oComboBox.getItems();
			var bValid = false;
			var sMatchedKey = "";

			for (var i = 0; i < aItems.length; i++) {
				var oItem = aItems[i];
				if (oItem.getText() === sEnteredText) {
					bValid = true;
					sMatchedKey = oItem.getKey();
					break;
				}
			}

			if (!bValid) {
				ErrorHandler.showCustomSnackbar("Invalid department. Please select a valid department.", "Error", this);
				oComboBox.setValue("");
				oContext.getModel().setProperty(oContext.getPath() + "/Dept", "");
				return;
			}
			oComboBox.setSelectedKey(sMatchedKey);
			oContext.getModel().setProperty(oContext.getPath() + "/Dept", sMatchedKey);
		},
		// Master F4 Fragment (Open,Search,Confirm)
		fn_getMasters: function(oEvent) {
			var that = this;
			if (!this.masterfrag) {
				this.masterfrag = sap.ui.xmlfragment("WorkflowRules.fragment.Masters", this);
				this.getView().addDependent(this.masterfrag);
			}
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var oPayload = {
				F4Type: "F",
				FieldId: "WID_MASTER",
				Process: "W"
			};
			oPayload.NavSerchResult = [];

			oModel.create("/SearchHelpSet", oPayload, {

				success: function(odata) {
					var jsonList = {
						List: odata.NavSerchResult.results
					};
					var oJsonList = new sap.ui.model.json.JSONModel();
					oJsonList.setData(jsonList);
					that.getView().setModel(oJsonList, "JM_MASTERS");

					that.masterfrag.open();

				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});

		},
		fn_masterSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = [
				new sap.ui.model.Filter("DomvalueL", sap.ui.model.FilterOperator.Contains, sValue),
				new sap.ui.model.Filter("Ddtext", sap.ui.model.FilterOperator.Contains, sValue)
			];

			var oBinding = oEvent.getSource().getBinding("items");
			var oFinalFilter = new sap.ui.model.Filter(oFilter, false);
			oBinding.filter(oFinalFilter);
		},

		fn_masterConfirm: function(oEvent) {
			var selectedItem = oEvent.getParameter("selectedItem");
			if (selectedItem && this._oF4SourceInput) {
				var sValue = selectedItem.getTitle();
				this._oF4SourceInput.setValue(sValue);
				this._oF4SourceInput = null;
			}
		},
		/************************************** Get Agent Details Function*********************/
		// fngetAgents: function(oEvent) {
		// 	var that = this;
		// 	this._oSelectedFieldId = oEvent.getSource();
		// 	if (!this.Agentfrag) {
		// 		this.Agentfrag = sap.ui.xmlfragment("WorkflowRules.fragment.AgentNamef4", this);
		// 		this.getView().addDependent(this.Agentfrag);
		// 	}
		// 	var oModel = this.getOwnerComponent().getModel("JMConfig");

		// 	var oPayload = {
		// 		F4Type: "P",
		// 		FieldId: "WID_AGENT",
		// 		Process: "W"
		// 	};
		// 	oPayload.NavSerchResult = [];

		// 	oModel.create("/SearchHelpSet", oPayload, {

		// 		success: function(odata) {

		// 			var jsonList = {
		// 				List: odata.NavSerchResult.results
		// 			};
		// 			var oJsonList = new sap.ui.model.json.JSONModel();
		// 			oJsonList.setData(jsonList);
		// 			that.getView().setModel(oJsonList, "F4HelpAgentModel");

		// 			that.Agentfrag.open();

		// 		},
		// 		error: function(oResponse) {
		// 			sap.m.MessageToast.show("Failed to fetch ValueHelp.");
		// 		}
		// 	});
		// },
		fnAgentSearchs: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = [
				new sap.ui.model.Filter("Value1", sap.ui.model.FilterOperator.Contains, sValue),
				new sap.ui.model.Filter("Value2", sap.ui.model.FilterOperator.Contains, sValue)
			];

			var oBinding = oEvent.getSource().getBinding("items");
			var oFinalFilter = new sap.ui.model.Filter(oFilter, false);
			oBinding.filter(oFinalFilter);
		},
		fnAgentConfirm: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (!oSelectedItem) return;

			// Get row data from the binding context
			var oContext = oSelectedItem.getBindingContext("F4HelpAgentModel");
			var sValue1 = oContext.getProperty("Value1"); // Agent ID
			var sValue2 = oContext.getProperty("Value2"); // Agent Name

			var oInput = this._oSelectedFieldId; // the source input field
			if (!oInput) return;

			var oAAContext = oInput.getBindingContext("AATableModel");

			if (oAAContext) {
				// === Normal AA Table Flow ===
				var oSelectedRow = oAAContext.getObject();
				var sLvl = oSelectedRow.LvlFromLD;

				var oModel = this.getView().getModel("AATableModel");
				var aAARows = oModel.getProperty("/tableDataAA") || [];

				var bDuplicate = aAARows.some(function(row) {
					return row !== oSelectedRow && row.LvlFromLD === sLvl && row.Agent === sValue1;
				});

				if (bDuplicate) {
					ErrorHandler.showCustomSnackbar("This Agent is already assigned to the selected Level.", "Error", this);
					this._oF4SourceInput = null;
					return;
				}

				oInput.setValue(sValue1);
				oInput.fireChange({
					value: sValue1
				});

				var sPath = oAAContext.getPath();
				oModel.setProperty(sPath + "/Name", sValue2);
				oModel.setProperty(sPath + "/Agent", sValue1);
				oModel.refresh(true);

				this._oSelectedFieldId = null;
				this._checkMinApprCompletion();
				return;
			}

			// === Mass Agent Change (dynamic box) ===
			var oVBox = sap.ui.core.Fragment.byId("massagentid", "dynamicAgentBox");
			var aInputs = oVBox.findAggregatedObjects(true, function(oControl) {
				return oControl instanceof sap.m.Input;
			});

			if (aInputs.length >= 2) {
				var oOldInput = null,
					oNewInput = null;

				if (aInputs.length === 2) {
					oOldInput = aInputs[0];
					oNewInput = aInputs[1];
				} else if (aInputs.length === 3) {
					oOldInput = aInputs[1];
					oNewInput = aInputs[2];
				}

				if (oInput === oOldInput && oNewInput.getValue() === sValue1) {
					ErrorHandler.showCustomSnackbar("Old Agent and New Agent cannot be the same.", "Error", this);
					sap.m.MessageToast.show();
					this._oF4SourceInput = null;
					return;
				}

				if (oInput === oNewInput && oOldInput.getValue() === sValue1) {
					ErrorHandler.showCustomSnackbar("New Agent cannot be the same as Old Agent.", "Error", this);
					this._oF4SourceInput = null;
					return;
				}

				oInput.setValue(sValue1);
				oInput.fireChange({
					value: sValue1
				});

				this._oF4SourceInput = null;
				return;
			}

			// === Fallback ===
			oInput.setValue(sValue1);
			oInput.fireChange({
				value: sValue1
			});
			this._oF4SourceInput = null;
		},
		/************************************** Get Agent Details Function*********************/
		// Dynamically Creating WfParam's
		// fnBuildWorkflowInputs: function(sAppId) {
		// 	var oView = this.getView();
		// 	var oHBox = oView.byId("idParmHBox");
		// 	var oJScreenParmModel = oView.getModel("JScreenParm");
		// 	var aParms = oJScreenParmModel.getProperty("/List") || [];
		// 	var oJMConfigModel = this.getOwnerComponent().getModel("JMConfig");

		// 	// Remove previous dynamic workflow fields only
		// 	oHBox.getItems().forEach(function(oItem) {
		// 		if (oItem.hasStyleClass("cl_dyn_wfparm")) {
		// 			oHBox.removeItem(oItem);
		// 		}
		// 	});

		// 	if (!aParms.length) return;

		// 	// Collect all parm IDs from the JScreenParm model
		// 	var aFieldIds = [];
		// 	var oParmRow = aParms[0]; // Always one row based on your payload
		// 	for (var i = 1; i <= 4; i++) {
		// 		if (oParmRow["WfParm" + i + "Id"]) {
		// 			aFieldIds.push({
		// 				id: oParmRow["WfParm" + i + "Id"],
		// 				label: oParmRow["WfParm" + i + "Name"]
		// 			});
		// 		}
		// 	}

		// 	// Fetch Wf_parm_uiSet for all parm IDs (batched using $filter)
		// 	var aFilter = [
		// 		new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, sAppId)
		// 	];
		// 	oJMConfigModel.read("/Wf_parm_uiSet", {
		// 		filters: aFilter,
		// 		success: function(oData) {
		// 			var aUIConfigs = oData.results;

		// 			aFieldIds.forEach(function(oField) {
		// 				var oUIConf = null;
		// 				for (var j = 0; j < aUIConfigs.length; j++) {
		// 					if (aUIConfigs[j].FieldId === oField.id) {
		// 						oUIConf = aUIConfigs[j];
		// 						break;
		// 					}
		// 				}
		// 				var iMaxLength = 20; // JMConfig value
		// 				if (oUIConf && oUIConf.MaxLength) {
		// 					iMaxLength = parseInt(oUIConf.MaxLength, 10);
		// 				}
		// 				var sInputType = sap.m.InputType.Text; // JMConfig
		// 				var sAllowedPattern = null;
		// 				if (oUIConf && oUIConf.Type === "N") {
		// 					sInputType = sap.m.InputType.Number;
		// 					sAllowedPattern = /[^0-9]/g; // remove everything except numbers
		// 					var iMaxLengthForNumber = iMaxLength;
		// 				} else if (oUIConf && oUIConf.Type === "A") {
		// 					sInputType = sap.m.InputType.Text;
		// 					sAllowedPattern = /[^a-zA-Z0-9]/g; // remove everything except letters/numbers
		// 				}
		// 				var oOldInput = sap.ui.getCore().byId(oField.id);
		// 				if (oOldInput) {
		// 					oOldInput.destroy();
		// 				}
		// 				// Build VBox
		// 				var oVBox = new sap.m.VBox({
		// 					width: "13%",
		// 					visible: true
		// 				}).addStyleClass("sapUiSmallMarginBeginEnd cl_dyn_wfparm"); // Mark as dynamic

		// 				// Label
		// 				var oText = new sap.m.Label({
		// 					text: oField.label,
		// 					design: "Standard"
		// 				}).addStyleClass("cl_inputLabel");
		// 				oVBox.addItem(oText);

		// 				// Input
		// 				var oInput = new sap.m.Input({
		// 					id: oField.id,
		// 					placeholder: oField.label,
		// 					maxLength: iMaxLength,
		// 					type: sInputType,
		// 					liveChange: function(oEvent) {
		// 						var oSrc = oEvent.getSource();
		// 						var val = oEvent.getParameter("value");
		// 						if (sInputType === sap.m.InputType.Number) {
		// 							val = val.replace(/[eE\+\-]/g, ""); // remove e, E, +, -
		// 						}
		// 						if (sAllowedPattern) {
		// 							val = val.replace(sAllowedPattern, "");
		// 						}

		// 						if (sInputType === sap.m.InputType.Number && val.length > iMaxLength) {
		// 							val = val.substring(0, iMaxLength);
		// 						}

		// 						val = val.toUpperCase();

		// 						oSrc.setValue(val);

		// 						if (val.length === iMaxLength) {
		// 							this.fn_validateF4Value(oField.id, val, function(bValid) {
		// 								if (!bValid) {
		// 									sap.m.MessageToast.show("Invalid value for field.");
		// 									oSrc.setValue("");
		// 								}
		// 							});
		// 						}
		// 					}.bind(this),
		// 					showValueHelp: true,
		// 					valueHelpOnly: false,
		// 					valueHelpRequest: function(oEvent) {
		// 						this.fn_GetValueHelp(oField.id, oEvent);
		// 					}.bind(this)
		// 				}).addStyleClass("cl_inputField sapUiTinyMarginEnd");
		// 				oVBox.addItem(oInput);
		// 				// Add VBox to HBox
		// 				oHBox.addItem(oVBox);
		// 			}, this);
		// 		}.bind(this),
		// 		error: function() {
		// 			sap.m.MessageToast.show("Failed to fetch workflow UI config");
		// 		}
		// 	});
		// },
		// F4 help Data

		formatValueHelpItem: function(oItem) {
			// oItem is the data context of one list item
			var val1 = oItem.Ddtext || oItem.Value1;
			var val2 = oItem.DomvalueL || oItem.Value2;
			return val1 && val2 ? val1 + ' - ' + val2 : (val1 || val2);
		},
		fn_GetValueHelpSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = [
				new sap.ui.model.Filter("Value1", sap.ui.model.FilterOperator.Contains, sValue),
				new sap.ui.model.Filter("Value2", sap.ui.model.FilterOperator.Contains, sValue)
			];

			var oBinding = oEvent.getSource().getBinding("items");
			var oFinalFilter = new sap.ui.model.Filter(oFilter, false);
			oBinding.filter(oFinalFilter);

		},

		// fn_GetValueHelpConfirm: function(oEvent) {
		// 	var selectedItem = oEvent.getParameter("selectedItem");
		// 	if (!selectedItem) return;

		// 	//  Source input that triggered the value help
		// 	var oInput = oEvent.getSource().getBindingContext() ? oEvent.getSource() : this._oSelectedFieldId; // fallback
		// 	if (!oInput) return;

		// 	var sValue = selectedItem.getTitle().split("-")[0].trim();

		// 	var oBinding = oInput.getBinding("value");
		// 	if (oBinding && oBinding.getModel() === this.getView().getModel("copyModel")) {
		// 		// Copy Dialog input
		// 		var oCopyModel = this.getView().getModel("copyModel");
		// 		var oCreated = oCopyModel.getProperty("/created") || {};

		// 		var sPath = oBinding.getPath();
		// 		var sKey = sPath.split("/").pop();

		// 		var tempRow = Object.assign({}, oCreated);
		// 		tempRow[sKey] = sValue;

		// 		var oModel = this.getView().getModel("GDTableModel");
		// 		var aData = oModel.getProperty("/GDTableData") || [];

		// 		var isDuplicate = aData.some(function(row) {
		// 			return (
		// 				row.WfParm1 === (tempRow.WfParm1 || "") &&
		// 				row.WfParm2 === (tempRow.WfParm2 || "") &&
		// 				row.WfParm3 === (tempRow.WfParm3 || "") &&
		// 				row.WfParm4 === (tempRow.WfParm4 || "")
		// 			);
		// 		});

		// 		if (isDuplicate) {
		// 			sap.m.MessageToast.show("Duplicate entry already exists. Please select another one.");
		// 		} else {
		// 			oCopyModel.setProperty("/created/" + sKey, sValue);
		// 			oInput.setValue(sValue);
		// 			oInput.fireChange({
		// 				value: sValue
		// 			});
		// 		}
		// 	} 
		// 	// else if (oModel === this.getView().getModel("MassInputModel")) {
		// 	// 	// mass copy logic
		// 	// 	var sParmKey = oInput.data("parmKey"); // you already attach parmKey to each input
		// 	// 	var oMassModel = this.getView().getModel("MassInputModel");
		// 	// 	var sOldValue = oMassModel.getProperty("/" + sParmKey);

		// 	// 	if (sOldValue === sValue) {
		// 	// 		sap.m.MessageToast.show("Same as existing value. Please select a different one.");
		// 	// 		oInput.setValue(""); // clear input
		// 	// 	} else {
		// 	// 		oMassModel.setProperty("/" + sParmKey, sValue);
		// 	// 		oInput.setValue(sValue);
		// 	// 		oInput.fireChange({
		// 	// 			value: sValue
		// 	// 		});
		// 	// 	}
		// 	// } 
		// 	else {
		// 		// Normal input / table F4
		// 		oInput.setValue(sValue);
		// 		oInput.fireChange({
		// 			value: sValue
		// 		});
		// 	}

		// 	this._oSelectedFieldId = null;
		// },
		// fn_GenericValueHelpRequest: function(oEvent) {
		// 	var oInput = oEvent.getSource();
		// 	var oContext = oInput.getBindingContext("GDTableModel");
		// 	var oRowData = oContext.getObject(); // e.g., { WfParm1: "...", isNew: true }
		// 	var sPath = oInput.getBindingInfo("value").parts[0].path;
		// 	var iParmNumber = sPath.replace("WfParm", ""); // e.g., "1", "2", etc.
		// 	var oFieldConfig = this.getView().getModel("JScreenParm").getProperty("/List/0");
		// 	var sFieldId = oFieldConfig["WfParm" + iParmNumber + "Id"];
		// 	this._oSelectedFieldId = oInput;
		// 	this.fn_GetValueHelp(sFieldId, oEvent);
		// },

		// 
		// fn_GenericMassValueHelpRequest: function(oEvent) {
		// 	var oInput = oEvent.getSource();
		// 	// Get the parameter key from custom data (attached during onRadioSelectMass)
		// 	var sParmKey = oInput.data("parmKey");
		// 	if (!sParmKey) return;
		// 	// Get field configuration from JScreenParm model
		// 	var iParmNumber = sParmKey.replace("WfParm", "");
		// 	var oFieldConfig = this.getView().getModel("JScreenParm").getProperty("/List/0");
		// 	var sFieldId = oFieldConfig["WfParm" + iParmNumber + "Id"];
		// 	// Keep track of the selected input
		// 	this._oSelectedFieldId = oInput;
		// 	// Call the unified ValueHelp function
		// 	this.fn_GetValueHelp(sFieldId, oEvent);
		// },
		fn_validateF4Value: function(sFieldId, sInputValue, fnCallback) {
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var oPayload = {
				F4Type: "P",
				FieldId: sFieldId,
				Process: "K"
			};
			oPayload.NavSerchResult = [];

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
		},
		fn_getMassAppid: function(oEvent) {
			if (!this.MassAgentAppidfrag) {
				this.MassAgentAppidfrag = sap.ui.xmlfragment("WorkflowRules.fragment.MassAppid", this);
				this.getView().addDependent(this.MassAgentAppidfrag);
			}
			this.MassAgentAppidfrag.open();
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
		fn_loadsladata: function() {
			var oPayload = this._emailContext;
			if (!oPayload) {
				ErrorHandler.showCustomSnackbar("No context available for SLA fetch.", "Error", this);
				return;
			}

			// Build cache key
			var sCacheKey = [
				oPayload.Lvl || "",
				oPayload.WfParm1 || "",
				oPayload.WfParm2 || "",
				oPayload.WfParm3 || "",
				oPayload.AppId || ""
			].join("|");

			this._slaMap = this._slaMap || {};
			if (this._slaMap[sCacheKey]) {
				var oCache = this._slaMap[sCacheKey];

				// Bind all SLA emails with SlaType
				var aData = [].concat(
					(oCache.Emails.ALL || []).map(function(e) {
						e.MailType = 'ALL';
						return e;
					}),
					(oCache.Emails.REMINDER || []).map(function(e) {
						e.MailType = 'REMINDER';
						return e;
					}),
					(oCache.Emails.ESCALATION || []).map(function(e) {
						e.MailType = 'ESCALATION';
						return e;
					})
				);

				var seen = {};
				aData = aData.filter(function(item) {
					var key = item.MailId;
					if (!key) return false;

					if (seen[key]) {
						if (seen[key] === "ALL") {
							return false; // skip duplicate
						}
						if (item.MailType === "ALL") {
							seen[key] = "ALL"; // prefer ALL
							return true;
						}
						return false;
					}
					seen[key] = item.MailType;
					return true;
				});
				var oTable = sap.ui.core.Fragment.byId("emailFragId", "id_slaemailtable");
				var oModel = oTable.getModel("SlaList");
				if (!oModel) {
					oModel = new sap.ui.model.json.JSONModel({
						SlaList: aData
					});
					oTable.setModel(oModel, "SlaList");
				} else {
					oModel.setProperty("/SlaList", aData);
				}

				sap.ui.core.Fragment.byId("emailFragId", "ID_SLAREMDATE").setValue(oCache.ReminderDays || "");
				sap.ui.core.Fragment.byId("emailFragId", "ID_SLAREMTIME").setValue(oCache.ReminderTime || "");
				sap.ui.core.Fragment.byId("emailFragId", "ID_SLAESCDATE").setValue(oCache.EscalationDays || "");
				sap.ui.core.Fragment.byId("emailFragId", "ID_SLAESCTIME").setValue(oCache.EscalationTime || "");
				sap.ui.core.Fragment.byId("emailFragId", "ID_EMAILCOMBOBOX").setSelectedKey(oCache.MailType || "ALL");
				sap.ui.core.Fragment.byId("emailFragId", "ID_EXTAPR").setSelected(!!oCache.ExsitingApprover);
				var oLDModel = this.getView().getModel("LDTableModel");
				var aLDData = oLDModel.getProperty("/tableDataNew") || [];
				aLDData.forEach(function(row) {
					if (row.Lvl === oPayload.Lvl && row.WfParm1 === oPayload.WfParm1) {
						row.RemWfDays = oCache.ReminderDays || "";
						row.EscWfDays = oCache.EscalationDays || "";
						row.EscWfHour = oCache.EscalationTime || "";
						row.RemWfHour = oCache.ReminderTime || "";

					}
				});
				oLDModel.refresh();
				return; // skip backend call
			}

			// No cache found → fetch from backend
			var oSlaPayload = {
				AppId: oPayload.AppId,
				WfParm1: oPayload.WfParm1,
				WfParm2: oPayload.WfParm2,
				WfParm3: oPayload.WfParm3,
				WfParm4: oPayload.WfParm4,
				Lvl: oPayload.Lvl,
				Flag: "M",
				Navmail: [],
				Navwf_sla: []
			};

			var that = this;
			var oModelBackend = this.getOwnerComponent().getModel("JMConfig");
			oModelBackend.create("/WFMailSet", oSlaPayload, {
				success: function(oData) {
					var aSlaList = oData.Navwf_sla.results || [];
					// Initialize cache
					if (!that._slaMap[sCacheKey]) {
						that._slaMap[sCacheKey] = {
							Emails: {
								ALL: [],
								REMINDER: [],
								ESCALATION: []
							},
							ReminderDays: "",
							ReminderTime: "",
							EscalationDays: "",
							EscalationTime: "",
							MailType: "ALL",
							ExsitingApprover: false
						};
					}

					var oCache = that._slaMap[sCacheKey];

					// Group SLA emails by MailType
					for (var i = 0; i < aSlaList.length; i++) {
						var oItem = aSlaList[i];
						if (!oCache.Emails[oItem.MailType]) {
							oCache.Emails[oItem.MailType] = [];
						}
						oCache.Emails[oItem.MailType].push(oItem);

						if (oItem.Process === "REMINDER") {
							oCache.ReminderDays = oItem.WfDays;
							oCache.ReminderTime = that._formatTimeFromDuration(oItem.WfHours);
						}
						if (oItem.Process === "ESCALATION") {
							oCache.EscalationDays = oItem.WfDays;
							oCache.EscalationTime = that._formatTimeFromDuration(oItem.WfHours);
						}
					}

					// Bind all emails to table with SlaType
					var aData = []
						.concat(
							(oCache.Emails.ALL || []).map(function(e) {
								e.MailType = 'ALL';
								return e;
							}),
							(oCache.Emails.REMINDER || []).map(function(e) {
								e.MailType = 'REMINDER';
								return e;
							}),
							(oCache.Emails.ESCALATION || []).map(function(e) {
								e.MailType = 'ESCALATION';
								return e;
							})
						);
					var seen = {};
					aData = aData.filter(function(item) {
						var key = item.MailId;
						if (!key) return false;

						if (seen[key]) {
							if (seen[key] === "ALL") {
								return false; // skip duplicate
							}
							if (item.MailType === "ALL") {
								seen[key] = "ALL"; // prefer ALL
								return true;
							}
							return false;
						}
						seen[key] = item.MailType;
						return true;
					});
					var oTable = sap.ui.core.Fragment.byId("emailFragId", "id_slaemailtable");
					var oModel = oTable.getModel("SlaList");
					if (!oModel) {
						oModel = new sap.ui.model.json.JSONModel({
							SlaList: aData
						});
						oTable.setModel(oModel, "SlaList");
					} else {
						oModel.setProperty("/SlaList", aData);
					}

					sap.ui.core.Fragment.byId("emailFragId", "ID_SLAREMDATE").setValue(oCache.ReminderDays);
					sap.ui.core.Fragment.byId("emailFragId", "ID_SLAREMTIME").setValue(oCache.ReminderTime);
					sap.ui.core.Fragment.byId("emailFragId", "ID_SLAESCDATE").setValue(oCache.EscalationDays);
					sap.ui.core.Fragment.byId("emailFragId", "ID_SLAESCTIME").setValue(oCache.EscalationTime);
					sap.ui.core.Fragment.byId("emailFragId", "ID_EMAILCOMBOBOX").setSelectedKey(oCache.MailType);
					var oLDModel = that.getView().getModel("LDTableModel");
					var aLDData = oLDModel.getProperty("/tableDataNew") || [];
					aLDData.forEach(function(row) {
						if (row.Lvl === oPayload.Lvl && row.WfParm1 === oPayload.WfParm1) {
							row.RemWfDays = oCache.ReminderDays || "";
							row.EscWfDays = oCache.EscalationDays || "";
							row.EscWfHour = oCache.EscalationTime || "";
							row.RemWfHour = oCache.ReminderTime || "";
						}
					});
					oLDModel.refresh();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},
		onIconTabSelect: function(oEvent) {
			var sKey = oEvent.getParameter("key");

			if (sKey === "SLA") {
				this.fn_getMailType();
				this.fn_loadsladata();
			}
		},
		// formating into HH:mm
		_formatTimeFromDuration: function(sDuration) {
			if (typeof sDuration === "string") {
				return sDuration;
			}
			if (sDuration && typeof sDuration === "object" && "ms" in sDuration) {
				var totalMs = sDuration.ms;
				var totalMinutes = Math.floor(totalMs / 60000);
				var hours = Math.floor(totalMinutes / 60);
				var minutes = totalMinutes % 60;
				return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
			}

		},

		fn_getMailType: function(oEvent) {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("JMConfig");

			var oPayload = {
				F4Type: "F",
				FieldId: "WID_MAIL_TYPE",
				Process: "W"
			};
			oPayload.NavSerchResult = [];

			oModel.create("/SearchHelpSet", oPayload, {
				success: function(oData) {
					var aMappedData = oData.NavSerchResult.results.map(function(item) {
						return {
							key: item.DomvalueL,
							text: item.DomvalueL
						};
					});

					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData({
						List: aMappedData
					});

					// Set this model for the ComboBox binding
					that.getView().setModel(oJsonModel, "JM_SLASELMODEL");
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},
		fnaddSlaEmail: function() {
			this._slaMap = this._slaMap || {};
			var oPayload = this._emailContext;
			if (!oPayload) {
				ErrorHandler.showCustomSnackbar("No SLA context available", "Error", this);
				return;
			}

			function convertBooleanToXSpace(value) {
				return value === true || value === "True" || value === "X" ? "X" : " ";
			}

			function convertUIHrsToBackend(sTime) {
				if (!sTime) return null;
				var parts = sTime.split(":");
				var hh = parts[0].padStart(2, "0");
				var mm = (parts[1] || "00").padStart(2, "0");
				var ss = "00";
				return "PT" + hh + "H" + mm + "M" + ss + "S";
			}
			var sKey = [
				oPayload.Lvl || "",
				oPayload.WfParm1 || "",
				oPayload.WfParm2 || "",
				oPayload.WfParm3 || "",
				oPayload.AppId || ""
			].join("|");

			var sEmail = sap.ui.core.Fragment.byId("emailFragId", "id_slamail").getValue().trim();
			if (!sEmail) {
				ErrorHandler.showCustomSnackbar("Please enter an email", "Error", this);
				return;
			}

			var oEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!oEmailRegex.test(sEmail)) {
				ErrorHandler.showCustomSnackbar("Invalid email format", "Error", this);
				return;
			}

			var oCache = this._slaMap[sKey];
			var sMailType = oCache ? oCache.MailType : "ALL";

			if (!oCache) {
				var bExistingApprover = sap.ui.core.Fragment.byId("emailFragId", "ID_EXTAPR").getSelected();
				this._slaMap[sKey] = {
					Emails: {
						ALL: [],
						REMINDER: [],
						ESCALATION: []
					},
					MailType: sMailType,
					ReminderDays: "",
					ReminderTime: "",
					EscalationDays: "",
					EscalationTime: "",
					ExsitingApprover: bExistingApprover
				};
				oCache = this._slaMap[sKey];
			}

			var aData = oCache.Emails[sMailType] || [];

			for (var i = 0; i < aData.length; i++) {
				if (aData[i].MailId.toLowerCase() === sEmail.toLowerCase()) {
					ErrorHandler.showCustomSnackbar("Email already exists", "Error", this);
					return;
				}
			}

			var bExistingApprover = sap.ui.core.Fragment.byId("emailFragId", "ID_EXTAPR").getSelected();
			var oNew = {
				MailId: sEmail,
				MailType: sMailType,
				ExsitingApprover: bExistingApprover ? "X" : ""
			};
			aData.push(oNew);
			oCache.Emails[sMailType] = aData;

			// update UI table
			var oTable = sap.ui.core.Fragment.byId("emailFragId", "id_slaemailtable");
			var oModel = oTable.getModel("SlaList");
			if (!oModel) {
				oModel = new sap.ui.model.json.JSONModel({
					SlaList: [].concat(oCache.Emails.ALL, oCache.Emails.REMINDER, oCache.Emails.ESCALATION)
				});
				oTable.setModel(oModel, "SlaList");
			} else {
				oModel.setProperty("/SlaList", [].concat(
					oCache.Emails.ALL,
					oCache.Emails.REMINDER,
					oCache.Emails.ESCALATION
				));
			}

			var oLDModel = this.getView().getModel("LDTableModel");
			var aLDData = oLDModel.getProperty("/tableDataNew");

			aLDData.forEach(function(row) {
				if (row.Lvl === oPayload.Lvl && row.WfParm1 === oPayload.WfParm1) {
					row.RemWfDays = oCache.ReminderDays || "";
					row.EscWfDays = oCache.EscalationDays || "";
					row.EscWfHour = oCache.EscalationTime || "";
					row.RemWfHour = oCache.ReminderTime || "";

					// �NEW: if row is already saved, send SLA create call
					if (!row.isNew) {
						// build SLA payload only
						var oSlaPayload = {
							AppId: oPayload.AppId,
							WfParm1: oPayload.WfParm1,
							WfParm2: oPayload.WfParm2,
							WfParm3: oPayload.WfParm3,
							WfParm4: oPayload.WfParm4,
							Flag: "S",
							Navleveldef: [],
							Navagentassign: [],
							Navmailfinal: [],
							Nav_wf_sla: []
						};

						// grab SLA map for this level
						var oSla = this._slaMap[sKey];
						var cleanLvl = oPayload.Lvl;

						// REMINDER
						if (oSla.ReminderDays || oSla.ReminderTime) {
							(oSla.Emails.REMINDER || []).forEach(function(mailObj) {
								oSlaPayload.Nav_wf_sla.push({
									AppId: oPayload.AppId,
									WfParm1: oPayload.WfParm1,
									WfParm2: oPayload.WfParm2,
									WfParm3: oPayload.WfParm3,
									WfParm4: oPayload.WfParm4,
									Lvl: cleanLvl,
									Process: "REMINDER",
									ExsitingApprover: convertBooleanToXSpace(oSla.ExsitingApprover),
									MailId: mailObj.MailId,
									MailType: "REMINDER",
									WfDays: oSla.ReminderDays || null,
									WfHours: convertUIHrsToBackend(oSla.ReminderTime),
									Flag: ""
								});
							});
						}

						// ESCALATION
						if (oSla.EscalationDays || oSla.EscalationTime) {
							(oSla.Emails.ESCALATION || []).forEach(function(mailObj) {
								oSlaPayload.Nav_wf_sla.push({
									AppId: oPayload.AppId,
									WfParm1: oPayload.WfParm1,
									WfParm2: oPayload.WfParm2,
									WfParm3: oPayload.WfParm3,
									WfParm4: oPayload.WfParm4,
									Lvl: cleanLvl,
									Process: "ESCALATION",
									ExsitingApprover: convertBooleanToXSpace(oSla.ExsitingApprover),
									MailId: mailObj.MailId,
									MailType: "ESCALATION",
									WfDays: oSla.EscalationDays || null,
									WfHours: convertUIHrsToBackend(oSla.EscalationTime),
									Flag: ""
								});
							});
						}

						// ALL
						(oSla.Emails.ALL || []).forEach(function(mailObj) {
							if (oSla.ReminderDays || oSla.ReminderTime) {
								oSlaPayload.Nav_wf_sla.push({
									AppId: oPayload.AppId,
									WfParm1: oPayload.WfParm1,
									WfParm2: oPayload.WfParm2,
									WfParm3: oPayload.WfParm3,
									WfParm4: oPayload.WfParm4,
									Lvl: cleanLvl,
									Process: "REMINDER",
									ExsitingApprover: convertBooleanToXSpace(oSla.ExsitingApprover),
									MailId: mailObj.MailId,
									MailType: "ALL",
									WfDays: oSla.ReminderDays,
									WfHours: convertUIHrsToBackend(oSla.ReminderTime),
									Flag: ""
								});
							}
							if (oSla.EscalationDays || oSla.EscalationTime) {
								oSlaPayload.Nav_wf_sla.push({
									AppId: oPayload.AppId,
									WfParm1: oPayload.WfParm1,
									WfParm2: oPayload.WfParm2,
									WfParm3: oPayload.WfParm3,
									WfParm4: oPayload.WfParm4,
									Lvl: cleanLvl,
									Process: "ESCALATION",
									ExsitingApprover: convertBooleanToXSpace(oSla.ExsitingApprover),
									MailId: mailObj.MailId,
									MailType: "ALL",
									WfDays: oSla.EscalationDays,
									WfHours: convertUIHrsToBackend(oSla.EscalationTime),
									Flag: ""
								});
							}
						});

						// now call backend
						var oBackendModel = this.getOwnerComponent().getModel("JMConfig");
						oBackendModel.create("/WFMainSet", oSlaPayload, {
							success: function() {
								ErrorHandler.showCustomSnackbar("SLA Email added successfully", "success", this);
							},
							error: function(oResponse) {
								busyDialog.close();
								var sMessage = ErrorHandler.parseODataError(oResponse);
								ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
							}.bind(this)
						});
					}
				}
			}.bind(this));

			oLDModel.refresh();
			sap.ui.core.Fragment.byId("emailFragId", "id_slamail").setValue("");
			ErrorHandler.showCustomSnackbar("SLA Email added", "success", this);
		},

		onSlaMailTypeChange: function(oEvent) {
			var sSelected = oEvent.getSource().getSelectedKey();
			var oPayload = this._emailContext;
			if (!oPayload) return;

			var sKey = [
				oPayload.Lvl || "",
				oPayload.WfParm1 || "",
				oPayload.WfParm2 || "",
				oPayload.WfParm3 || "",
				oPayload.AppId || ""
			].join("|");

			var oCache = this._slaMap[sKey];
			if (!oCache) return;
			oCache.MailType = sSelected;
		},
		fn_slavalidation: function(oEvent) {
			var oSrc = oEvent.getSource();
			var sVal = oEvent.getParameter("value") || "";
			sVal = sVal.replace(/\D/g, "");
			if (sVal.length > 2) {
				sVal = sVal.substring(0, 2);
			}

			oSrc.setValue(sVal);
		},

		onSlaFieldChange: function(oEvent) {
			var timeToMinutes = function(time) {
				var parts = time.split(":");
				return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
			};

			var oPayload = this._emailContext;
			if (!oPayload) return;

			var sCacheKey = [
				oPayload.Lvl || "",
				oPayload.WfParm1 || "",
				oPayload.WfParm2 || "",
				oPayload.WfParm3 || "",
				oPayload.AppId || ""
			].join("|");

			this._slaMap = this._slaMap || {};
			var oCache = this._slaMap[sCacheKey];
			if (!oCache) return;

			var sId = oEvent.getSource().getId();
			if (sId.indexOf("ID_SLAREMDATE") !== -1) {
				oCache.ReminderDays = oEvent.getSource().getValue();
			}
			if (sId.indexOf("ID_SLAREMTIME") !== -1) {
				oCache.ReminderTime = oEvent.getSource().getValue();
			}
			if (sId.indexOf("ID_SLAESCDATE") !== -1) {
				oCache.EscalationDays = oEvent.getSource().getValue();
			}
			if (sId.indexOf("ID_SLAESCTIME") !== -1) {
				oCache.EscalationTime = oEvent.getSource().getValue();
			}

			if (sId.indexOf("ID_EXTAPR") !== -1) {
				oCache.ExsitingApprover = oEvent.getSource().getSelected();
			}
			var oLDModel = this.getView().getModel("LDTableModel");
			var aLDData = oLDModel.getProperty("/tableDataNew");
			aLDData.forEach(function(row) {
				if (row.Lvl === oPayload.Lvl && row.WfParm1 === oPayload.WfParm1) {
					row.RemWfDays = oCache.ReminderDays;
					row.EscWfDays = oCache.EscalationDays;
					row.EscWfHour = oCache.EscalationTime;
					row.RemWfHour = oCache.ReminderTime;
				}
			});
			oLDModel.refresh();
			if (oCache.ReminderDays != null && oCache.EscalationDays != null) {
				var rDays = oCache.ReminderDays;
				var eDays = oCache.EscalationDays;

				var rMins = oCache.ReminderTime ? timeToMinutes(oCache.ReminderTime) : null;
				var eMins = oCache.EscalationTime ? timeToMinutes(oCache.EscalationTime) : null;

				if (eDays < rDays) {
					sap.m.MessageToast.show("Escalation cannot be less than Reminder (days/hours)");

					if (sId.indexOf("ID_SLAESCDATE") !== -1 || sId.indexOf("ID_SLAESCTIME") !== -1) {
						oEvent.getSource().setValue("");
						if (sId.indexOf("ID_SLAESCDATE") !== -1) oCache.EscalationDays = null;
						if (sId.indexOf("ID_SLAESCTIME") !== -1) oCache.EscalationTime = null;
					}
				} else if (eDays === rDays && rMins !== null && eMins !== null && eMins < rMins) {
					sap.m.MessageToast.show("Escalation cannot be less than Reminder (days/hours)");

					if (sId.indexOf("ID_SLAESCDATE") !== -1 || sId.indexOf("ID_SLAESCTIME") !== -1) {
						oEvent.getSource().setValue("");
						if (sId.indexOf("ID_SLAESCDATE") !== -1) oCache.EscalationDays = null;
						if (sId.indexOf("ID_SLAESCTIME") !== -1) oCache.EscalationTime = null;

					}
				}
				aLDData.forEach(function(row) {
					if (row.Lvl === oPayload.Lvl && row.WfParm1 === oPayload.WfParm1) {
						row.EscWfDays = oCache.EscalationDays || "";
						row.RemWfDays = oCache.RemainderDays || "";
						row.EscWfHour = oCache.EscalationTime || "";
						row.RemWfHour = oCache.ReminderTime || "";
					}
				});
				oLDModel.refresh();

			}

		},

		fnRemoveSlaEmail: function(oEvent) {
			var oTable = sap.ui.core.Fragment.byId("emailFragId", "id_slaemailtable");
			var aSelectedIndices = oTable.getSelectedIndices();

			if (aSelectedIndices.length === 0) {
				sap.m.MessageToast.show("Please select at least one SLA email to delete.");
				return;
			}

			var oModel = oTable.getModel("SlaList");
			var aData = oModel.getProperty("/SlaList") || [];
			var aSelectedSla = [];

			for (var i = 0; i < aSelectedIndices.length; i++) {
				var oContext = oTable.getContextByIndex(aSelectedIndices[i]);
				if (oContext) {
					aSelectedSla.push(oContext.getObject());
				}
			}

			var that = this;
			sap.m.MessageBox.confirm("Are you sure you want to delete selected SLA emails?", {
				onClose: function(sAction) {
					if (sAction !== "OK") return;

					var oPayloadToDelete = [];
					var sCacheKey = [
						that._emailContext.Lvl || "",
						that._emailContext.WfParm1 || "",
						that._emailContext.WfParm2 || "",
						that._emailContext.WfParm3 || "",
						that._emailContext.AppId || ""
					].join("|");

					var oCache = that._slaMap[sCacheKey];
					if (oCache) {
						for (var j = 0; j < aSelectedSla.length; j++) {
							var oItem = aSelectedSla[j];

							if (oItem.MailType && oCache.Emails[oItem.MailType]) {
								oCache.Emails[oItem.MailType] = oCache.Emails[oItem.MailType].filter(function(e) {
									return e.MailId !== oItem.MailId;
								});
							}

							if (!oItem.__isNew) {
								oPayloadToDelete.push(oItem);
							}
						}

						// Rebuild table model from all types
						var aFiltered = [].concat(
							oCache.Emails.ALL || [],
							oCache.Emails.REMINDER || [],
							oCache.Emails.ESCALATION || []
						);
						aFiltered.forEach(function(e) {
							e.MailType = e.MailType || e.MailType;
						});
						oModel.setProperty("/SlaList", aFiltered);
					}

					if (aSelectedSla.some(function(e) {
							return e.__isNew;
						})) {
						sap.m.MessageToast.show("SLA email(s) removed locally.");
					}

					if (oPayloadToDelete.length > 0) {
						var oPayload = {
							AppId: oPayloadToDelete[0].AppId,
							WfParm1: oPayloadToDelete[0].WfParm1,
							WfParm2: oPayloadToDelete[0].WfParm2,
							WfParm3: oPayloadToDelete[0].WfParm3,
							WfParm4: oPayloadToDelete[0].WfParm4,
							Lvl: oPayloadToDelete[0].Lvl,
							Flag: "N",
							Navwf_sla: oPayloadToDelete
						};
						that.getOwnerComponent().getModel("JMConfig").create("/WFMailSet", oPayload, {
							success: function() {
								sap.m.MessageToast.show("SLA emails deleted Successfully");
								that.fnReloadSlaData({
									AppId: oPayloadToDelete[0].AppId,
									WfParm1: oPayloadToDelete[0].WfParm1,
									WfParm2: oPayloadToDelete[0].WfParm2,
									WfParm3: oPayloadToDelete[0].WfParm3,
									WfParm4: oPayloadToDelete[0].WfParm4,
									Lvl: oPayloadToDelete[0].Lvl
								});
							},
							error: function(oResponse) {
								busyDialog.close();
								var sMessage = ErrorHandler.parseODataError(oResponse);
								ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
							}.bind(this)
						});
					}

					oTable.clearSelection();
				}
			});
		},

		fnsingleRemoveSlaEmail: function(oEvent) {
			var oContext = oEvent.getSource().getBindingContext("SlaList");
			if (!oContext) {
				sap.m.MessageToast.show("Unable to determine SLA email to delete.");
				return;
			}

			var oDeletedSla = oContext.getObject();
			var oTable = sap.ui.core.Fragment.byId("emailFragId", "id_slaemailtable");
			var oModel = oTable.getModel("SlaList");
			var aData = oModel.getProperty("/SlaList") || [];

			var that = this;
			sap.m.MessageBox.confirm("Are you sure you want to delete this SLA email?", {
				styleClass: "cl_emailcancel",
				onClose: function(sAction) {
					if (sAction !== "OK") return;

					var aFiltered = aData.filter(function(item) {
						return !(item.MailId === oDeletedSla.MailId && item.MailType === oDeletedSla.MailType);
					});
					oModel.setProperty("/SlaList", aFiltered);

					var sCacheKey = [
						that._emailContext.Lvl || "",
						that._emailContext.WfParm1 || "",
						that._emailContext.WfParm2 || "",
						that._emailContext.WfParm3 || "",
						that._emailContext.AppId || ""
					].join("|");

					var oCache = that._slaMap[sCacheKey];
					if (oCache && oDeletedSla.MailType) {
						oCache.Emails[oDeletedSla.MailType] = (oCache.Emails[oDeletedSla.MailType] || []).filter(function(item) {
							return item.MailId !== oDeletedSla.MailId;
						});
					}

					if (oDeletedSla.__isNew) {
						sap.m.MessageToast.show("SLA email removed locally.");
						return;
					}

					var oPayload = {
						AppId: oDeletedSla.AppId,
						WfParm1: oDeletedSla.WfParm1,
						WfParm2: oDeletedSla.WfParm2,
						WfParm3: oDeletedSla.WfParm3,
						WfParm4: oDeletedSla.WfParm4,
						Lvl: oDeletedSla.Lvl,
						Flag: "N",
						Navwf_sla: [oDeletedSla]
					};

					that.getOwnerComponent().getModel("JMConfig").create("/WFMailSet", oPayload, {
						success: function() {
							sap.m.MessageToast.show("SLA email deleted.");
							that.fnReloadSlaData(oDeletedSla);
						},
						error: function() {
							sap.m.MessageToast.show("Failed to delete SLA email from backend.");
						}
					});
				}
			});
		},
		fnReloadSlaData: function(oContextData) {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("JMConfig");
			var oSlaModel = this.getView().getModel("SlaList");

			var oPayload = {
				AppId: oContextData.AppId,
				WfParm1: oContextData.WfParm1,
				WfParm2: oContextData.WfParm2,
				WfParm3: oContextData.WfParm3 || "",
				WfParm4: oContextData.WfParm4 || "",
				Lvl: oContextData.Lvl || "",
				Flag: "M",
				Navwf_sla: []
			};

			oModel.create("/WFMailSet", oPayload, {
				success: function(oData) {
					var aResults = (oData.Navwf_sla && oData.Navwf_sla.results) ? oData.Navwf_sla.results : [];
					oSlaModel.setProperty("/SlaList", aResults);

				},
				error: function(oErr) {
					sap.m.MessageToast.show("Failed to reload SLA data.");

				}
			});
		},
		// formatter fn
		fnformatSLADays: function(sDays, sHrs) {
			// Reuse helper to normalize into HH:mm
			var sTime = this._formatTimeFromDuration(sHrs);

			var bDaysMaintained = sDays && sDays !== "00";
			var bTimeMaintained = sTime !== "00:00";

			if (!bDaysMaintained && !bTimeMaintained) {
				return "";
			}

			if (bDaysMaintained && bTimeMaintained) {
				return sDays + "/" + sTime;
			}
			if (bDaysMaintained) {
				return sDays;
			}
			if (bTimeMaintained) {
				return sTime;
			}
		},
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
				case "Unsaved":
					this.onConfirmProceed();
					break;
				case "VariantSave":
					this.FnchangeVar();
					break;
				case "VariantDelete":
					this.onDeleteSelectedVariants();
					break;
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
				case "MassDelete":
					this.fn_MassDeletePress();
					break;

			}
		},

		onConfirmCancel: function() {
			this.confirmfrag.close();
		},
		fnF4press: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			this.selectedField = id;
			var f4type;
			if (["DID_STATUS", "WID_APPID"].includes(id)) {
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
		fn_GenericCopyValueHelpRequest: function(oEvent) {
			var oInput = oEvent.getSource();
			var sPath = oInput.getBindingInfo("value").parts[0].path;
			var sKey = sPath.split("/").pop();
			var iParmNumber = sKey.replace("WfParm", "");
			var oFieldConfig = this.getView().getModel("JScreenParm").getProperty("/List/0");
			var sFieldId = oFieldConfig["WfParm" + iParmNumber + "Id"];
			this._oSelectedFieldId = oInput;
			this.dynamicFieldCopyFlag = true;
			this.fn_GetValueHelp(sFieldId, oEvent);
		},
		fn_GetValueHelp: function(Fieldid, oEvent) {
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

		bindTextF4model: function(opayload, oEvent) {
			var oJsonModel;
			var vTitle;
			var oLabels = {};
			var vLength;
			var aFormattedRows = [];
			var omodel1 = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			omodel1.create("/SearchHelpSet", opayload, {
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
							if (this.selectedField && this.selectedField === "WID_APPID") {
								var aResults = aResults.filter(function(item) {
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

								// this.agentFieldFlag = false;
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
			if (!oBinding) return;
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

		fnF4Itempress: function(oEvent) {
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_F4Model");
			if (!oContext) {
				return;
			}
			var item = oContext.getProperty("col1"); // Value (e.g., 'IN')
			var item1 = oContext.getProperty("col2"); // Description (e.g., 'India')

			if (this.selectedField === "WID_APPID" && !this.dynamicFieldFlag) {
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
			} else if (this.agentFieldFlag) {
				var oInput = this._oSelectedFieldId;
				if (!oInput) return;
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
				this.fn_GetValueHelpConfirm(item);
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

		fn_GetValueHelpConfirm: function(item) {
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
							sInputType = sap.m.InputType.Number;
							sAllowedPattern = /[^0-9]/g; // remove everything except numbers
							var iMaxLengthForNumber = iMaxLength;
						} else if (oUIConf && oUIConf.Type === "A") {
							sInputType = sap.m.InputType.Text;
							sAllowedPattern = /[^a-zA-Z0-9]/g; // remove everything except letters/numbers
						}
						var oOldInput = sap.ui.getCore().byId(oField.id);
						if (oOldInput) {
							oOldInput.destroy();
						}
						// Build VBox
						var oVBox = new sap.m.VBox({
							width: "13%",
							visible: true
						}).addStyleClass(" sapUiSmallMarginEnd cl_dyn_wfparm"); // Mark as dynamic

						// Label
						var oLabel = new sap.m.Label({
							text: oField.label,
							labelFor: oField.id
						}).addStyleClass("cl_inputLabel");
						oVBox.addItem(oLabel);
						
						// Input
						var oInput = new sap.m.Input({
							id: this.createId(oField.id),
							// placeholder: oField.label,
							maxLength: iMaxLength,
							type: sInputType,
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

								if (sInputType === sap.m.InputType.Number && val.length > iMaxLength) {
									val = val.substring(0, iMaxLength);
								}
								val = val.toUpperCase();
								oSrc.setValue(val);
								if (val.length === iMaxLength) {
									this.fn_validateF4Value(oField.id, val, function(bValid, sLabel) {
										if (!bValid) {
											ErrorHandler.showCustomSnackbar("Invalid value entered for " + sLabel + ".", "Error", this);
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
							sInputType = sap.m.InputType.Number;
							sAllowedPattern = /[^0-9]/g;
						} else if (oUIConf.Type === "A") {
							sInputType = sap.m.InputType.Text;
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
							type: sInputType,
							valueHelpOnly: false,
							showValueHelp: true,
							liveChange: function(oEvent) {
								var oSrc = oEvent.getSource();
								var val = oEvent.getParameter("value");
								if (sAllowedPattern) {
									val = val.replace(sAllowedPattern, "");
								}
								if (sInputType === sap.m.InputType.Number && val.length > iMaxLength) {
									val = val.substring(0, iMaxLength);
								}
								val = val.toUpperCase();
								oSrc.setValue(val);
								if (val.length === iMaxLength) {
									this.fn_validateF4Value(field.id, val, function(bValid, sLabel) {
										if (!bValid) {
											ErrorHandler.showCustomSnackbar("Invalid value entered for " + sLabel + ".", "Error", this);
											oSrc.setValue("");
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
		fnGetValueHelp: function(Fieldid, oEvent) {
			var id = Fieldid;
			this.selectedField = id;
			this._oSelectedFieldId = oEvent.getSource();
			this.dynamicFieldFlag = true;
			var f4type;
			if (["DID_STATUS", "WID_APPID"].includes(id)) {
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
		fngetAppidmassAgent: function(oEvent) {
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
		fnclearSection: function() {
			this.change = true;
			this._bIsEditMode = false;
			this.byId("id_LDTable").removeStyleClass("cl_maxfield");
			this.byId("id_search").setEnabled(true);
			this.byId("id_ChngeSrch").setEnabled(false);
			this.byId("id_forAgent").setEnabled(false);
			this.byId("id_saveWf").setEnabled(false);
			// this.byId("id_Mass").setEnabled(false);
			// this.byId("id_massdel").setEnabled(false);
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
			// this.byId("ID_VARIANT_INPUT").removeStyleClass("cl_chtabInput");
			this._bAddEnabled = false;
			this._bAddEnabledLD = false;
			this.getView().getModel("viewModel").setProperty("/isComboEditable", false);
			this.getView().getModel("viewModel").setProperty("/isEditable", false);
			var oHBox = this.byId("id_WfParm");

			if (oHBox) {
				var aItems = oHBox.getItems();

				// Destroy each control manually
				for (var i = 0; i < aItems.length; i++) {
					aItems[i].destroy();
				}

				// Clear aggregation after destruction
				oHBox.removeAllItems();
			}

			this.getView().byId("WID_APPID").setValue("");
			this._iSelectedLDIndex = undefined;
			this._oSelectedLDRow = null;
			this.dynamicFieldCopyFlag = false;
			this.agentFieldFlag = false;
			this.dynamicFieldFlag = false;
			var oView = this.getView();

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
			// this.onConfirmChangeSearch();
			this._oSelectedFieldId = undefined;
		}
	});

});