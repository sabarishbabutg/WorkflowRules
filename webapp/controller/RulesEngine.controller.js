sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"WorkflowRules/controller/ErrorHandler",
	"sap/ui/model/resource/ResourceModel",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Filter",
	"WorkflowRules/Formatter/formatter"
], function(Controller, ErrorHandler, ResourceModel, FilterOperator, Filter, formatter) {
	"use strict";
	var i18n;
	var busyDialog = new sap.m.BusyDialog();
	return Controller.extend("WorkflowRules.controller.RulesEngine", {
		formatter: formatter,
		onInit: function() {
			var i18nModel = new ResourceModel({
				bundleName: "WorkflowRules.i18n.i18n"
			});
			this.getView().setModel(i18nModel, "i18n");

			i18n = this.getView().getModel("i18n").getResourceBundle();

			this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.getRoute("RulesEngine").attachPatternMatched(this.fnRouter, this);
		},
		fnRouter: function() {
			// ********************* IMAGE MODEL ************************
			var vPathImage = jQuery.sap.getModulePath("WorkflowRules") + "/Image/";
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: vPathImage
			});
			this.getView().setModel(oImageModel, "JM_ImageModel");

			// **********************************************************
			var that = this;
			var vmodel = this.getOwnerComponent().getModel("JMConfig");
			vmodel.read("/RulesSet", {
				filters: [new sap.ui.model.Filter("RulesCheck", sap.ui.model.FilterOperator.EQ, "X")],
				success: function(oData) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData({
						results: oData.results
					});

					// Set model globally
					sap.ui.getCore().setModel(oJsonModel, "JM_FILTEREDRULE");

					var vFilterModel = sap.ui.getCore().getModel("JM_FILTEREDRULE");
					if (vFilterModel) {
						var aResults = vFilterModel.getProperty("/results");
						var aFmmDesList = aResults
							.filter(function(item) {
								return item.Fgroup === "035";
							})
							.map(function(item) {
								return item.FmmDes;
							});
						var oFmmDesModel = new sap.ui.model.json.JSONModel({
							FmmDesList: aFmmDesList
						});
						sap.ui.getCore().setModel(oFmmDesModel, "JM_FIELDDESC");
					}
					setTimeout(function() {
						this.createSnackbar();
					}.bind(this), 0);
				},
				error: function() {

					ErrorHandler.showCustomSnackbar("Failed to load filtered rules", "Error", this);
				}.bind(this)
			});
			/*Load User Details*/
			var vUserModel = this.getOwnerComponent().getModel("JMConfig");
			vUserModel.read("/UsernameSet", {
				success: function(odata) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData({
						Uname: odata.results[0].Uname,
						Sysid: odata.results[0].Agent,
						id: odata.results[0].Sysid
					});
					that.getView().setModel(oJsonModel, "JM_User");
				}
			});
			/*Button Enable model*/
			var oEnableModel = new sap.ui.model.json.JSONModel({
				Create: false,
				Add: false,
				Remove: false,
				Copy: false,
				Save: false,
				Delete: false,
				Refresh: false
			});
			this.getView().setModel(oEnableModel, "JM_Enabled");
		},
		// *--------------------------------------------------------------------------------------
		//								Rules Engine F4 Functinalities
		// *--------------------------------------------------------------------------------------
		fnAppId: function(oEvent) {
			this.selectedField = "RID_MASTER";
			var oPayload = {
				F4Type: "F",
				FieldId: "RID_MASTER",
				Process: "R"
			};
			oPayload.NavSerchResult = [];
			this.bindTextF4model(oPayload, oEvent);
		},

		fnGetScreens: function(oEvent) {
			var vappid = this.getView().byId("RID_MASTER").getValue().split("-")[0].trim();
			if (!vappid) {
				ErrorHandler.showCustomSnackbar("Please select AppId", "Information", this);
				return;
			}
			this.selectedField = "id_Screen";
			var vModel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			vModel.read("/RulesSet", {
				filters: [new Filter("App", FilterOperator.EQ, vappid)],
				success: function(oData) {
					var jsonList = {
						List: oData.results
					};
					var oJsonList = new sap.ui.model.json.JSONModel();
					oJsonList.setData(jsonList);
					this.getView().setModel(oJsonList, "JM_Screens");
					var oJsonModel;
					var vTitle;
					var oLabels = {};
					var vLength;
					var aFormattedRows = [];

					if (oData.MsgType === "E") {
						ErrorHandler.showCustomSnackbar(oData.Message, "Error", this);
						return;
					}
					var aResults = oData.results;
					if (aResults.length > 0) {
						vLength = aResults.length;
						oLabels.col1 = "Screen ID";
						oLabels.col2 = "Screen Name";
						aResults.forEach(function(item) {
							var row = {};
							row.col1 = item.Fgroup;
							row.col2 = item.Vwnm;
							aFormattedRows.push(row);
						});
						oJsonModel = new sap.ui.model.json.JSONModel({
							labels: oLabels,
							rows: aFormattedRows
						});
						this.getView().setModel(oJsonModel, "JM_F4Model");
						this.getView().getModel("JM_F4Model");
						vTitle = this.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
						this.fnF4fragopen(oEvent, vTitle).open();

					} else {
						ErrorHandler.showCustomSnackbar("Screen is not Matained for this Apllication Id", "Info", this);
						busyDialog.close();
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

		fnGetRuleSet: function(oEvent) {
			var that = this;
			var vmodel = that.getOwnerComponent().getModel("JMConfig");
			// var vCombinedFmmDes = sap.ui.getCore().getModel("JM_FIELDDESC").getProperty("/FmmDesList") || [];
			var vscreen = this.getView().byId("id_Screen").getValue().split("-")[0].trim();
			busyDialog.open();
			this.rulesetF4flag = true;
			vmodel.read("/RulesSet", {
				filters: [new Filter("Fgroup", FilterOperator.EQ, vscreen)],
				success: function(oData) {
					var oJsonModel;
					var vTitle;
					var oLabels = {};
					var vLength;
					var aFormattedRows = [];
					var filteredResults = [];
					var oDataResults = oData.results;
					for(var i = 0; i < oDataResults.length; i++){
						var data = oDataResults[i];
						if(data.VwnmId === "ID_KEY" && data.FnmId.substring(0, 3) === "KID"){
							filteredResults.push(data);
						}else if(data.VwnmId !== "ID_KEY" && data.FnmId.substring(0, 3) !== "KID"){
							filteredResults.push(data);
						}
					}
					var aResults = filteredResults;
					if (aResults.length > 0) {
						vLength = aResults.length;
						oLabels.col1 = "Rule Set Desc";
						aResults.forEach(function(item) {
							var row = {};
							row.col1 = item.FmmDes;
							aFormattedRows.push(row);
						});
						oJsonModel = new sap.ui.model.json.JSONModel({
							labels: oLabels,
							rows: aFormattedRows
						});
						this.getView().setModel(oJsonModel, "JM_F4Model");
						this.getView().getModel("JM_F4Model");
						vTitle = this.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
						var jsonList = {
							List: filteredResults
						};
						var oJsonList = new sap.ui.model.json.JSONModel();
						oJsonList.setData(jsonList);
						this.getView().setModel(oJsonList, "JM_RuleSet");
						this.fnF4fragopen(oEvent, vTitle).open();
						busyDialog.close();
					} else {
						ErrorHandler.showCustomSnackbar("Rule Set Id is not Maintained", "Info", this);
						busyDialog.close();
					}
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		fnvalue: function(oEvent) {
			var vContext = oEvent.getSource().getBindingContext("JM_RuleData");
			if (vContext) {
				this.vSelectedRowPath = vContext.getPath();
				var fnmIdValue = vContext.getProperty("FnmId");
				var resultmodel = sap.ui.getCore().getModel("JM_FILTEREDRULE");
				var aresults = resultmodel.getProperty("/results");
				var oTargetField = aresults.find(function(item) {
					return item.FnmId === fnmIdValue;
				});
				if (oTargetField) {
					var vid = oTargetField.FnmId;
					var vSearchhelp = oTargetField.SearchHelp;
					var vProcess = oTargetField.Process;
					if (vSearchhelp === "T") {
						this.fnDatePicker(oEvent.getSource());
					} else if (vSearchhelp === "F") {
						var oPayload = {
							F4Type: vSearchhelp,
							FieldId: vid,
							Process: "X"
						};
						oPayload.NavSerchResult = [];
						this.ruleDataValueFlag = true;
						this.bindTextF4model(oPayload, oEvent);
						// this.fnSearchHelp(oEvent.getSource(), oPayload);
					} else {
						oPayload = {
							F4Type: vSearchhelp,
							FieldId: vid,
							Process: vProcess
						};
						oPayload.NavSerchResult = [];
						this.ruleDataValueFlag = true;
						this.bindTextF4model(oPayload, oEvent);
						// this.fnSearchHelp(oEvent.getSource(), oPayload);
					}
				}
			}

		},
		bindSearchepModel: function(state, oData) {
			if (state) {
				var label1 = oData.NavSerchResult.results.length > 0 ? oData.NavSerchResult.results[0].Label1 : "";
				var jsonList = {
					Label1: label1,
					List: oData.NavSerchResult.results
				};
				var oJsonList = new sap.ui.model.json.JSONModel();
				oJsonList.setData(jsonList);
				this.getView().setModel(oJsonList, "JM_SearchHelp");
			}
		},

		fnfieldname: function(oEvent) {
			var oJsonModel;
			var vTitle;
			var oLabels = {};
			var vLength;
			var aFormattedRows = [];
			this.index1 = oEvent.getSource().getBindingContext("JM_RuleData").getPath().split('/');
			var vModel = this.getOwnerComponent().getModel("JMConfig");
			var fnmSet = new Set();
			var tModel = this.getView().getModel("JM_RuleData");
			if (tModel) {
				var tData = tModel.getProperty("/") || [];
				tData.forEach(function(parent) {
					if (parent.Fnm) {
						fnmSet.add(parent.Fnm);
					}
					if (Array.isArray(parent.Input)) {
						parent.Input.forEach(function(child) {
							if (child.Fnm) {
								fnmSet.add(child.Fnm);
							}
						});
					}
				});
			}
			var vscreen = this.getView().byId("id_Screen").getValue().split("-")[0].trim();
			busyDialog.open();
			vModel.read("/RulesSet", {
				filters: [
					new Filter("Fgroup", FilterOperator.EQ, vscreen)
				],
				success: function(oData, Response) {
					var filteredFields = oData.results.filter(function(item) {
						return !fnmSet.has(item.Fnm); // Exclude if already in JM_TTABLE
					});
					var jsonList = {
						List: filteredFields
					};
					var oJsonList = new sap.ui.model.json.JSONModel();
					oJsonList.setData(jsonList);
					this.getView().setModel(oJsonList, "JM_Fields");
					vLength = filteredFields.length;
					oLabels.col1 = "Field Name";
					oLabels.col2 = "Field Descriptions";
					oLabels.col3 = "Field ID";
					filteredFields.forEach(function(item) {
						var row = {};
						row.col1 = item.Fnm;
						row.col2 = item.FmmDes;
						row.col3 = item.FnmId;
						// row.col4 = item.Value4;
						aFormattedRows.push(row);
					});
					oJsonModel = new sap.ui.model.json.JSONModel({
						labels: oLabels,
						rows: aFormattedRows
					});
					this.getView().setModel(oJsonModel, "JM_F4Model");
					this.getView().getModel("JM_F4Model");
					this.ruleDataFieldNameFlag = true;
					vTitle = this.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
					this.fnF4fragopen(oEvent, vTitle).open();
					// oLabels.col4 = oFirst.Label4;
					busyDialog.close();
					// 		that.rulefieldfrag.open();
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
				}
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
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error");
								return;
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
							var jsonList = {
								List: odata.NavSerchResult.results
							};
							var oJsonList = new sap.ui.model.json.JSONModel();
							oJsonList.setData(jsonList);
							this.getView().setModel(oJsonList, "JM_Appid");
							this.getView().setModel(oJsonModel, "JM_F4Model");
							this.bindSearchepModel(this.ruleDataValueFlag, odata);
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
							this.bindSearchepModel(this.ruleDataValueFlag, odata);
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
				}
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

		fnAppIdSearch: function(oEvent) {
			var vValue = oEvent.getParameter("value");
			var vFilter = [
				new Filter("DomvalueL", FilterOperator.Contains, vValue),
				new Filter("Ddtext", FilterOperator.Contains, vValue)
			];

			var vBinding = oEvent.getSource().getBinding("items");
			var vFinalFilter = new Filter(vFilter, false);
			vBinding.filter(vFinalFilter);
		},

		fnF4Itempress: function(oEvent) {
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_F4Model");
			if (!oContext) {
				return;
			}
			var item = oContext.getProperty("col1"); // Value (e.g., 'IN')
			var item1 = oContext.getProperty("col2"); // Description (e.g., 'India')
			var item2 = oContext.getProperty("col3"); // Description (e.g., 'India')
			if (this.selectedField === "RID_MASTER") {
				this.getView().byId("RID_MASTER").setValue(item + " - " + item1);
				this.getView().byId("id_Screen").setValue("");
			} else if (this.selectedField === "id_Screen") {
				this.getView().byId("id_Screen").setValue(item + " - " + item1);
				this.vRulesFetched = false;
			} else if (this.rulesetF4flag) {
				this.fnRuleSetClose(item);
				this.rulesetF4flag = false;
			} else if (this.ruleDataValueFlag) {
				this.fnSearchHelpConfirm(item, item1);
				this.ruleDataValueFlag = false;
			} else if (this.ruleDataFieldNameFlag) {
				this.fnRuleFieldConfirm(item, item1, item2);
				this.ruleDataFieldNameFlag = false;
			}
			this.fnAfterCloseFragment();
			this.selectedField = null;
		},
		
		fnSearchHelpConfirm: function(item, item1) {
			var oModel = this.getView().getModel("JM_RuleData");
			oModel.setProperty(this.vSelectedRowPath + "/Value", item);
			oModel.setProperty(this.vSelectedRowPath + "/RuleText", item1);
			this.fnCheckDuplicates();
		},
		fnRuleSetClose: function(item) {
			var vRulesetTable = this.getView().byId("id_ruleTable");
			var vItemIndex = vRulesetTable.getSelectedIndex();

			var arr = this.getView().getModel("JM_RuleSet").getData();
			var Arrres = [];
			for (var i = 0; i < arr.List.length; i++) {
				var currentItem = arr.List[i];
				if (currentItem && currentItem.FmmDes === item) {
					var oarr = {
						AppId: currentItem.App,
						Fgroup: currentItem.Fgroup,
						Fnm: currentItem.Fnm,
						FnmId: currentItem.FnmId,
						Vwnm: currentItem.Vwnm,
						VwnmId: currentItem.VwnmId
					};
					Arrres.push(oarr);
				}
			}
			var aRulesId = this.getView().getModel("JM_RuleRef").getData();
			var vRuleSetId = "";
			if (!aRulesId || aRulesId.length === 0) {
				vRuleSetId = "001"; // default initial value if no prior RuleSetId found
			} else {
				vRuleSetId = parseInt(aRulesId[aRulesId.length - 1].RuleSetId) + 1;
				vRuleSetId = vRuleSetId + '';
				vRuleSetId = vRuleSetId.padStart(3, "0");
			}
			if (item) {
				// var vSave = 2;
				var oTabModel = this.getView().getModel("JM_Rules");
				if (oTabModel) {
					var oTabData = oTabModel.getData();
					// Check if Rule array and index exists
					if (oTabData.Rule && oTabData.Rule[vItemIndex]) {
						oTabData.Rule[vItemIndex].FmmDes = item;
						oTabData.Rule[vItemIndex].AppId = Arrres[0].AppId;
						oTabData.Rule[vItemIndex].Fgroup = Arrres[0].Fgroup;
						oTabData.Rule[vItemIndex].Fnm = Arrres[0].Fnm;
						oTabData.Rule[vItemIndex].FnmId = Arrres[0].FnmId;
						oTabData.Rule[vItemIndex].RuleSetId = vRuleSetId;
						oTabData.Rule[vItemIndex].Vwnm = Arrres[0].Vwnm;
						oTabData.Rule[vItemIndex].VwnmId = Arrres[0].VwnmId;
						oTabModel.refresh(true);
					}
				}
			}
		},
		fnAppIdClose: function(oEvent) {
			var vitem = oEvent.getParameter("selectedItem").getProperty("title");
			this.getView().byId("RID_MASTER").setValue(vitem);
			this.getView().byId("id_Screen").setValue("");

		},
		fnRuleFieldConfirm: function(item, item1, item2) {
			var vFnm = item;
			var vFnmDes = item1;
			var vFnmId = item2;
			var oTabModel = this.getView().getModel("JM_RuleData");
			var oTabData = oTabModel.getData();
			var rowRef;
			if (this.index1.length === 4) {
				rowRef = oTabData[this.index1[1]].Input[this.index1[3]];
			} else if (this.index1.length === 2) {
				rowRef = oTabData[this.index1[1]];
			}
			if (!rowRef) {
				return;
			}
			if (rowRef.Fnm !== vFnm) {
				rowRef.Value = "";
				rowRef.RuleText = "";
			}
			rowRef.Fnm = vFnm;
			rowRef.FmmDes = vFnmDes;
			rowRef.FnmId = vFnmId;
			oTabModel.refresh(true);
		},

		// *-----------------------------------------------------------------------------------------
		//					Search Button functionality press
		// *-----------------------------------------------------------------------------------------
		fnGetRules: function() {
			var that = this;
			var vappid = this.getView().byId("RID_MASTER").getValue().split("-")[0].trim();
			var vscreen = this.getView().byId("id_Screen").getValue().split("-")[0].trim();
			var vtable = this.getView().byId("id_ruleTable");
			if (!vappid) {
				ErrorHandler.showCustomSnackbar("Please select appid", "Information", this);
				return;
			}
			if (!vscreen) {
				ErrorHandler.showCustomSnackbar("Please select screen", "Information", this);
				return;
			}
			var vModel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			vModel.read("/RulehSet", {
				filters: [
					new Filter("AppId", FilterOperator.EQ, vappid),
					new Filter("Fgroup", FilterOperator.EQ, vscreen)
				],
				success: function(oData) {
					var jsonList = {
						Rule: oData.results
					};
					var oJsonList = new sap.ui.model.json.JSONModel();
					oJsonList.setData(jsonList);
					that.getView().setModel(oJsonList, "JM_Rules");
					busyDialog.close();
					that.vRulesFetched = true;
					// that.fnref();
					if (oData.results && oData.results.length > 0) {
						vtable.setSelectedIndex(0);
					} else {
						that.getView().getModel("JM_RuleData").setData({});
					}
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		// *-----------------------------------------------------------------------------------------
		//					Rule Set Row Selection
		// *-----------------------------------------------------------------------------------------
		fnRuleSetSelection: function(oEvent) {
			if (this.hasUnsavedChanges) {
				this.pendingEvent = oEvent;
				var vConfirmModel = new sap.ui.model.json.JSONModel({
					headerText: "Confirmation",
					confirmationText: "Are you sure unsaved data will be lost?",
					positiveText: "Yes",
					negativeText: "No",
					positiveIcon: "Apply.svg",
					negativeIcon: "Cancel.svg",
					action: "UnsavedData"
				});
				this.getView().setModel(vConfirmModel, "JM_Confirm");
				if (!this.confirmfrag) {
					this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.Fragment.ConfirmationRules", this);
					this.getView().addDependent(this.confirmfrag);
				}
				this.confirmfrag.open();
				return;
			}
			this.fnProcessSelection(oEvent);
		},
		
		fnProcessSelection: function(oEvent) {
			var vtable = this.getView().byId("id_ruleTable");
			var vTreeTable = this.getView().byId("id_datatable");
			var vSelectedIndex = vtable.getSelectedIndex();
			if (vSelectedIndex === -1) {
				this.getView().byId("id_datatable").clearSelection();
				this.getView().getModel("JM_RuleItems").refresh(true);
				return;
			}
			var vTableContext = vtable.getContextByIndex(vSelectedIndex);
			var vdata = vtable.getModel("JM_Rules").getProperty(vTableContext.getPath());
			var vRuleSetId = vdata.RuleSetId;
			var that = this;
			var vModel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			vModel.read("/RuleISet", {
				filters: [new Filter("RuleSetId", FilterOperator.EQ, vRuleSetId)],
				success: function(oData) {
					var jsonList = {
						RuleSet: oData.results
					};
					var oJsonList = new sap.ui.model.json.JSONModel();
					oJsonList.setData(jsonList);
					that.getView().setModel(oJsonList, "JM_RuleItems");
					busyDialog.close();
					that.fnsetTable();
					vTreeTable.setSelectedIndex(0);
					var allItems = oJsonList.getData().RuleSet || [];

					var relatedItems = allItems.filter(function(item) {
						return item.RuleSetId === vRuleSetId;
					});
					var allRuleIds = new Set(
						oData.results.map(function(item) {
							return item.RuleId;
						})
					);
					var ruleidcount = allRuleIds.size;
					var vEnableModel = that.getView().getModel("JM_Enabled");
					if (relatedItems.length === 0 && ruleidcount === 0) {
						vEnableModel.setProperty("/Create", true); // create
						vEnableModel.setProperty("/Add", false); // add & Remove
						vEnableModel.setProperty("/Remove", false);
						vEnableModel.setProperty("/Copy", false); // copy
						vEnableModel.setProperty("/Save", false); // Delete & Refresh & save
						vEnableModel.setProperty("/Delete", false);
						vEnableModel.setProperty("/Refresh", false);
					} else if (relatedItems.length !== 0 && ruleidcount === 1) {
						vEnableModel.setProperty("/Create", true);
						vEnableModel.setProperty("/Add", true);
						vEnableModel.setProperty("/Remove", true);
						vEnableModel.setProperty("/Copy", true);
						vEnableModel.setProperty("/Save", true);
						vEnableModel.setProperty("/Delete", false);
						vEnableModel.setProperty("/Refresh", false);
					} else {
						vEnableModel.setProperty("/Create", true);
						vEnableModel.setProperty("/Add", false);
						vEnableModel.setProperty("/Remove", false);
						vEnableModel.setProperty("/Copy", true);
						vEnableModel.setProperty("/Save", true);
						vEnableModel.setProperty("/Delete", true);
						vEnableModel.setProperty("/Refresh", true);
					}

				},
				error: function(oResponse) {
					busyDialog.close();
				}
			});
			var vColumn = this.getView().byId("id_tableui");
			if (vColumn) {
				var isVisible = this.fnCheckTableUi();
				vColumn.setVisible(isVisible);
			}

		},
		
		fnUnsavedPopup: function() {
			this.hasUnsavedChanges = false;
			this.fnProcessSelection(this.pendingEvent);
			this.pendingEvent = null;
		},

		// *-----------------------------------------------------------------------------------------
		//					Rule Data Row Selection
		// *-----------------------------------------------------------------------------------------
		fnExpandNode: function(oEvent) {
			var vRuleDataTable = this.getView().byId("id_datatable");
			var vBinding = vRuleDataTable.getBinding("rows");
			var vRowContext = oEvent.getParameters().rowContext;
			if (!vRowContext) {
				return;
			}
			var vPath = vRowContext.getPath();
			var vNodeIndex = -1;
			var vNodes = vBinding.getNodes();
			for (var i = 0; i < vNodes.length; i++) {
				if (vNodes[i].context.getPath() === vPath) {
					vNodeIndex = i;
					break;
				}
			}
			if (vNodeIndex !== -1) {
				vRuleDataTable.setSelectedIndex(vNodeIndex);
			}
		},

		/********************Set Rule Data in tree table***********************/
		fnsetTable: function() {
			var vRuleset = this.getView().getModel("JM_RuleItems").getData();
			var vRulesetInputs = [];
			var vRulesetOutputs = [];
			var vResults = [];
			var vRuleData = [];
			for (var i = 0; i < vRuleset.RuleSet.length; i++) {
				if (vRuleset.RuleSet[i].Ftype === 'R') {
					vRulesetOutputs.push(vRuleset.RuleSet[i]);
				} else if (vRuleset.RuleSet[i].Ftype === 'I') {
					vRulesetInputs.push(vRuleset.RuleSet[i]);
				}
			}
			for (var a = 0; a < vRulesetOutputs.length; a++) {
				var aInput = [];
				for (var b = 0; b < vRulesetInputs.length; b++) {
					var arr;
					if (vRulesetInputs[b].RuleId === vRulesetOutputs[a].RuleId) {
						arr = {
							'FmmDes': vRulesetInputs[b].FmmDes,
							'Fnm': vRulesetInputs[b].Fnm,
							'FnmId': vRulesetInputs[b].FnmId,
							'Ftype': vRulesetInputs[b].Ftype,
							'RuleId': vRulesetInputs[b].RuleId,
							'RuleSetId': vRulesetInputs[b].RuleSetId,
							'Value': vRulesetInputs[b].Value,
							'RuleText': vRulesetInputs[b].RuleText

						};

						aInput.push(arr);
					}
				}
				vResults = {

					'FmmDes': vRulesetOutputs[a].FmmDes,
					'Fnm': vRulesetOutputs[a].Fnm,
					'FnmId': vRulesetOutputs[a].FnmId,
					'Ftype': vRulesetOutputs[a].Ftype,
					'RuleId': vRulesetOutputs[a].RuleId,
					'RuleSetId': vRulesetOutputs[a].RuleSetId,
					'Value': vRulesetOutputs[a].Value,
					'RuleText': vRulesetOutputs[a].RuleText,
					'TableRow': vRulesetOutputs[a].TableRow,
					"ChangeInd": vRulesetOutputs[a].ChangeInd === "X",
					'Input': aInput

				};
				vRuleData.push(vResults);
			}
			var oModel = new sap.ui.model.json.JSONModel(vRuleData);
			this.getView().setModel(oModel, "JM_RuleData");
		},
		/********************Set Rule Data in tree table***********************/

		/********************Create RuleSet***********************/
		fnAddRuleSet: function() {
			if (this.vRulesFetched) {
				var that = this;
				var vtable = this.getView().byId("id_ruleTable");
				var vModel = vtable.getModel("JM_Rules");
				var vData = this.getView().getModel("JM_Rules").getData();
				if (vData.Rule.length !== 0) {
					if (vData.Rule[vData.Rule.length - 1].Fnm === "") {
						ErrorHandler.showCustomSnackbar("Please save the previous Ruleset to continue", "Information", this);
						return;
					}
				}
				var vNewEntry = {
					AppId: "",
					Fgroup: "",
					FmmDes: "",
					Fnm: "",
					FnmId: "",
					RuleSetId: "",
					Vwnm: "",
					VwnmId: "",
					isNew: true

				};
				var vItem = vModel.getProperty("/Rule");
				vItem.push(vNewEntry);
				vModel.setProperty("/Rule", vItem);
				var iNewIndex = vItem.length - 1;
				vtable.setSelectedIndex(iNewIndex);
				vtable.setFirstVisibleRow(iNewIndex);

				this.fnLoadRulesetIds();

			} else {
				ErrorHandler.showCustomSnackbar("Please Click on Search", "Information", this);
			}
		},
		/********************Create RuleSet***********************/

		/******************RuleSet SearchHelp*******************/

		fnRuleSetSearch: function(oEvent) {
			var vValue = oEvent.getParameter("value");
			var vFilter = [
				new Filter("FmmDes", FilterOperator.Contains, vValue)
			];
			var vBinding = oEvent.getSource().getBinding("items");
			var vFinalFilter = new Filter(vFilter, false);
			vBinding.filter(vFinalFilter);
		},

		/******************RuleSet SearchHelp*******************/

		/******************RuleField SearchHelp****************/

		/******************RuleField SearchHelp****************/

		/********************Delete RuleSet***********************/
		fnRemoveRuleSet: function() {

			var vRuleSetTable = this.getView().byId("id_ruleTable");
			var vItemIndex = vRuleSetTable.getSelectedIndex();
			if (vItemIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please select a ruleset to delete", "Information", this);
				return;
			}

			var vConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you sure you want to Delete?",
				positiveText: "Yes",
				negativeText: "No",
				positiveIcon: "Apply.svg",
				negativeIcon: "Cancel.svg",
				action: "DeleteRuleSet"
			});
			this.getView().setModel(vConfirmModel, "JM_Confirm");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.Fragment.ConfirmationRules", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},
		fnDeleteRuleSet: function() {
			var vRuleSetTable = this.getView().byId("id_ruleTable");
			var vItemIndex = vRuleSetTable.getSelectedIndex();
			var Arr = this.getView().getModel("JM_Rules").getData();
			var vSelectedRowData = [];
			vSelectedRowData.push(Arr.Rule[vItemIndex]);
			var vunsaved = vSelectedRowData[0].isNew;
			if (vunsaved) {
				Arr.Rule.splice(vItemIndex, 1); // remove from frontend array
				this.getView().getModel("JM_Rules").refresh(true);
				ErrorHandler.showCustomSnackbar("Unsaved Ruleset Removed", "success", this);
				return;
			}

			var vNavruleh = {
				"Flag": 'D',
				"NavRuleh": vSelectedRowData
			};
			var that = this;
			var vModel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			vModel.create("/DeepRuleSet", vNavruleh, {
				success: function() {
					busyDialog.close();
					ErrorHandler.showCustomSnackbar("Ruleset Deleted Successfully", "success", that);
					setTimeout(function() {
						that.fnGetRules();
					}, 500); // wait half a second
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});

		},
		/********************Delete RuleSet***********************/

		/********************Save RuleSet***********************/
		fnSaveRuleSet: function() {
			var vArr = this.getView().getModel("JM_Rules").getData();

			if (vArr.Rule.length === 0) {
				ErrorHandler.showCustomSnackbar("Please create a ruleset and enter valid data", "Information", this);
				return;
			} else if (vArr.Rule.length !== 0) {
				if (vArr.Rule[vArr.Rule.length - 1].Fnm === '') {
					ErrorHandler.showCustomSnackbar("Please enter valid data for the field added", "Information", this);
					return;
				}
			}
			var vConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you sure you want to save?",
				positiveText: "Yes",
				negativeText: "No",
				positiveIcon: "Apply.svg",
				negativeIcon: "Cancel.svg",
				action: "SaveRuleSet"
			});
			this.getView().setModel(vConfirmModel, "JM_Confirm");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.Fragment.ConfirmationRules", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},
		fnRulesetSave: function() {
			var vRulesetTable = this.getView().byId("id_ruleTable");
			var vRulesetData = this.getView().getModel("JM_Rules").getData();
			var cleanedRules = JSON.parse(JSON.stringify(vRulesetData.Rule)).map(function(rule) {
				delete rule.isNew; // remove property if it exists
				return rule;
			});

			var vNavh = {
				"Flag": 'H',
				"NavRuleh": cleanedRules
			};
			var that = this;

			var vModel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			vModel.create("/DeepRuleSet", vNavh, {
				success: function() {
					busyDialog.close();
					ErrorHandler.showCustomSnackbar("Ruleset saved successfully", "success", that);

				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},
		/********************Save RuleSet***********************/

		/********************RulesetModel Model for Rulesetid Generation***********************/
		fnLoadRulesetIds: function() {
			var that = this;
			var vmodel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			vmodel.read("/RulehSet", {

				filters: [new Filter("Fgroup", FilterOperator.EQ, '')],
				success: function(oData, Response) {

					var oJsonList = new sap.ui.model.json.JSONModel();
					oJsonList.setData(oData.results);
					that.getView().setModel(oJsonList, "JM_RuleRef");
					busyDialog.close();

				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},
		/********************RulesetModel Model for Rulesetid Generation***********************/

		/********************** Refrsh Functionality********************************/
		fnRefresh: function() {
			var vRuledataTable = this.getView().byId("id_datatable");
			var vRuleDataModel = this.getView().getModel("JM_RuleData");
			var vallData = vRuleDataModel.getProperty("/");
			var filteredData = vallData.filter(function(item) {
				return !item.isNew;
			});

			vRuleDataModel.setProperty("/", filteredData);
			this.hasUnsavedChanges = false;
			vRuledataTable.collapseAll();
			vRuledataTable.getBinding("rows").refresh();
			vRuledataTable.setSelectedIndex(0);

		},
		/********************** Refrsh Functionality********************************/

		/************************Table Row visibility function********************/
		fnCheckTableUi: function() {
			var vTable = this.getView().byId("id_ruleTable");
			var vselectedIndex = vTable.getSelectedIndex();
			if (vselectedIndex >= 0) {
				var vContext = vTable.getContextByIndex(vselectedIndex);
				if (vContext) {
					var vfnmIdvalue = vContext.getProperty("FnmId");
					var vresultmodel = sap.ui.getCore().getModel("JM_FILTEREDRULE");
					var aresults = vresultmodel.getProperty("/results");
					var vTargetField = aresults.find(function(item) {
						return item.FnmId === vfnmIdvalue;
					});
					if (vTargetField && vTargetField.TableUi === 'X') {
						return true;
					}
				}
			}
			return false;

		},
		/************************Table Row visibility function********************/

		/*************************Create New Rule Data***************************/
		fnCreateNewRuleData: function() {
			if (!this.fnValidateRuleInputs() || !this.fnCheckDuplicates()) {
				return;
			}
			var vRulesetTable = this.getView().byId("id_ruleTable");
			var vSelectedIndex = vRulesetTable.getSelectedIndex();
			this.previndex = vRulesetTable.getSelectedIndex();
			if (vSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please save and Select a Ruleset to proceed", "Information", this);
				return;
			}
			var that = this;
			var vappid = this.getView().byId("RID_MASTER").getValue().split("-")[0].trim();
			var vscritem = this.getView().byId("id_Screen").getValue().split("-")[0].trim();
			var vtableContext = vRulesetTable.getContextByIndex(vSelectedIndex);
			var vselectedRuleHeader = vRulesetTable.getModel("JM_Rules").getProperty(vtableContext.getPath());
			var vModel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			vModel.read("/RulehSet", {
				filters: [new Filter("AppId", FilterOperator.EQ, vappid),
					new Filter("Fgroup", FilterOperator.EQ, vscritem)
				],
				success: function(oData) {
					var vexistingRules = oData.results;
					busyDialog.close();
					var vcre = vexistingRules.some(function(rule) {
						return vselectedRuleHeader.FmmDes === rule.FmmDes;
					});
					if (vcre) {
						var itemModel = that.getView().getModel("JM_RuleData");
						var existingItems = itemModel.getData();
						var hasSavedRuleWithoutChildren = existingItems.some(function(rule) {
							return rule.Input && rule.Input.length === 0;
						});

						if (hasSavedRuleWithoutChildren) {
							ErrorHandler.showCustomSnackbar("Cannot add a new rule because a saved rule has no inputs", "Warning", this);
							return;
						}
						var newRuleId = existingItems.length > 0 ? (parseInt(existingItems[existingItems.length - 1].RuleId, 10) + 1).toString().padStart(
							3, "0") : "001";

						var newTableRowId = "";
						if (that.fnCheckTableUi()) {
							newTableRowId = (existingItems.length + 1).toString();
						}
						/************Btn enable pending****************/
						var vEnableModel = that.getView().getModel("JM_Enabled");
						if (newRuleId === "001") {
							vEnableModel.setProperty("/Add", true);
							vEnableModel.setProperty("/Remove", true);
							vEnableModel.setProperty("/Create", false);
							vEnableModel.setProperty("/Copy", true);
							vEnableModel.setProperty("/Save", true);
							vEnableModel.setProperty("/Delete", true);
							vEnableModel.setProperty("/Refresh", true);

						} else {
							vEnableModel.setProperty("/Add", false); // Disabling creation for "002"
							vEnableModel.setProperty("/Remove", false);
							vEnableModel.setProperty("/Copy", true);
							vEnableModel.setProperty("/Save", true);
							vEnableModel.setProperty("/Delete", true);
							vEnableModel.setProperty("/Refresh", true);

						}
						/************Btn enable pending****************/
						var newRuleItem = {
							"RuleId": newRuleId,
							"RuleSetId": vselectedRuleHeader.RuleSetId,
							"Fnm": vselectedRuleHeader.Fnm,
							"Value": "",
							"RuleText": "",
							"Ftype": "R",
							"FmmDes": vselectedRuleHeader.FmmDes,
							"FnmId": vselectedRuleHeader.FnmId,
							"TableRow": newTableRowId,
							"isNew": true,
							"ChangeInd": false

						};

						existingItems.push(newRuleItem);
						itemModel.setProperty("/", existingItems);
						that.hasUnsavedChanges = true;
						var vRuleDataTable = that.getView().byId("id_datatable");
						vRuleDataTable.collapseAll();
						var vNewIndex = existingItems.length - 1;
						vRuleDataTable.setSelectedIndex(vNewIndex);
						vRuleDataTable.setFirstVisibleRow(vNewIndex);
						var lastRuleWithChildren = existingItems[existingItems.length - 2]; // Last rule before the new one
						if (lastRuleWithChildren && lastRuleWithChildren.Input && lastRuleWithChildren.Input.length > 0) {
							var copiedChildren = JSON.parse(JSON.stringify(lastRuleWithChildren.Input));
							copiedChildren.forEach(function(child) {
								child.RuleId = newRuleId;
								child.Value = "";
								child.RuleText = "";
								child.TableRow = "";
							});

							var newIndex = -1;
							for (var i = 0; i < existingItems.length; i++) {
								if (existingItems[i].RuleId === newRuleId) {
									newIndex = i;
									break;
								}
							}
							if (newIndex !== -1) {
								existingItems[newIndex].Input = copiedChildren;
								itemModel.setProperty("/", existingItems);
							}
						}
					} else {
						ErrorHandler.showCustomSnackbar("Please save the ruleset to proceed", "Information", that);
					}
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)
			});
		},

		/*************************Create New Rule Data***************************/

		/*********** ReadOnly Checkbox selection******************************/
		fnReadOnlySelect: function(oEvent) {
			var vSelected = oEvent.getParameter("selected");
			var vContext = oEvent.getSource().getBindingContext("JM_RuleData");
			vContext.getModel().setProperty(vContext.getPath() + "/ChangeInd", vSelected);
		},
		/*********** ReadOnly Checkbox selection******************************/

		/*************************Add child Row************************************/
		fnAddRow: function() {
			var vRuleDataTable = this.getView().byId("id_datatable");
			var vSelectedIndex = vRuleDataTable.getSelectedIndex();
			if (vSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please select a main lineitem", "Information", this);
				return;
			}
			var vContextPath = vRuleDataTable.getContextByIndex(vSelectedIndex).getPath();
			var vpath = vContextPath.split("/");
			if (vpath.length !== 2) {
				ErrorHandler.showCustomSnackbar("Please select a main lineitem", "Information", this);
				return;
			}
			var vRuleDataModel = this.getView().getModel("JM_RuleData");
			var vData = vRuleDataModel.getData();
			var vSelectedItem = vData[vSelectedIndex];
			if (!Array.isArray(vSelectedItem.Input)) {
				vSelectedItem.Input = [];
			}
			if (vSelectedItem.Input.length >= 3) {
				ErrorHandler.showCustomSnackbar("You can only add up to 3 inputs for a rule item", "Warning", this);
				return;
			}
			var newInputItem = {
				FmmDes: "",
				Fnm: "",
				FnmId: "",
				Ftype: "I",
				RuleId: vSelectedItem.RuleId,
				RuleSetId: vSelectedItem.RuleSetId,
				Value: "",
				RuleText: ""
			};

			vSelectedItem.Input.push(newInputItem);
			vRuleDataModel.refresh(true);
			vRuleDataTable.expand(vSelectedIndex);

		},
		/*************************Add child Row************************************/

		/*************************Delete child Row************************************/
		fnRemoveRow: function(oEvent) {
			var oTable = this.byId("id_datatable");
			var iSelectedIndex = oTable.getSelectedIndex();

			if (iSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please Select a row first", "Information", this);
				return;
			}

			var oContext = oTable.getContextByIndex(iSelectedIndex);
			var sPath = oContext.getPath(); // "/0" or "/0/Input/1"
			var aParts = sPath.split("/"); // ["", "0", "Input", "1"]

			// If only parent row is selected
			if (aParts.length === 2) {
				ErrorHandler.showCustomSnackbar("Select a Sub RuleItem to proceed", "Information", this);
				return;
			}

			// If child row is selected → delete
			if (aParts.length === 4) {

				var oModel = oTable.getModel("JM_RuleData");

				// Parent path → "/0/Input"
				var parentPath = "/" + aParts[1] + "/" + aParts[2];

				// Index of child
				var childIndex = aParts[3];

				// Get child array under parent
				var aChildArray = oModel.getProperty(parentPath);

				if (Array.isArray(aChildArray)) {
					aChildArray.splice(childIndex, 1);
				}

				oModel.refresh();
				oTable.setSelectedIndex(-1);
			}
		},
		/*************************Delete child Row************************************/

		/**************************Value SearchHelp******************************/

		fnSearchHelpSearch: function(oEvent) {
			var vValue = oEvent.getParameter("value");
			var oFilter = [
				new Filter("Value1", sap.ui.model.FilterOperator.Contains, vValue),
				new Filter("Value2", sap.ui.model.FilterOperator.Contains, vValue)
			];

			var vBinding = oEvent.getSource().getBinding("items");
			var vFinalFilter = new Filter(oFilter, false);
			vBinding.filter(vFinalFilter);
		},

		fnDatePicker: function(oEvent) {
			var that = this;
			if (this.vDatePicker) {
				this.vDatePicker.destroy();
				this.vDatePicker = null;
			}
			this.vDatePicker = sap.m.DatePicker({
				valueFormat: "yyyy-MM-dd",
				displayFormat: "dd-MM-yyyy",
				change: function(oEvent) {
					var oDate = oEvent.getSource().getDateValue();
					if (oDate && that.vSelectedRowPath) {
						var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
							pattern: "yyyy-MM-dd"
						});
						var sFormattedDate = oDateFormat.format(oDate);
						var oModel = that.getView().getModel("JM_RuleData");
						oModel.setProperty(that.vSelectedRowPath + "/Value", sFormattedDate);
						oModel.setProperty(that.vSelectedRowPath + "/RuleText", ""); // Optional
					}
				}
			});
			this.getView().addDependent(this.vDatePicker);

			setTimeout(function() {
				that.vDatePicker.openBy(oEvent);
			}, 0);
		},
		/**************************Value SearchHelp******************************/

		/**************************Copy Rule Data******************************/
		fnCopyRuleData: function() {
			if (!this.fnValidateRuleInputs() || !this.fnCheckDuplicates()) {
				return;
			}
			var vRulesetTable = this.getView().byId("id_ruleTable");
			var vRuleDataTable = this.getView().byId("id_datatable");
			var vSelectedIndex = vRuleDataTable.getSelectedIndex();
			if (vSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please select a line item to proceed", "Information", this);
				return;
			}
			var vContext = vRuleDataTable.getContextByIndex(vSelectedIndex).getPath().split("/");
			if (vContext.length !== 2) {
				ErrorHandler.showCustomSnackbar("Please select a main line item to proceed", "Information", this);
				return;
			}
			this.previndex = vRulesetTable.getSelectedIndex();
			var vSelectedData = [];
			var vRuleDataModel = this.getView().getModel("JM_RuleData").getData();
			var vruleid = vRuleDataModel[vRuleDataModel.length - 1].RuleId;
			var vnewruleid = String(parseInt(vruleid, 10) + 1).padStart(3, "0");
			var vEnableModel = this.getView().getModel("JM_Enabled");

			if (vnewruleid === "002") {
				vEnableModel.setProperty("/Add", false);
				vEnableModel.setProperty("/Remove", false);
				vEnableModel.setProperty("/Copy", true);
				vEnableModel.setProperty("/Save", true);
				vEnableModel.setProperty("/Delete", true);
				vEnableModel.setProperty("/Refresh", true);

			}
			var newtablerow = "";
			if (this.fnCheckTableUi()) {
				var existingItems = vRuleDataModel.filter(function(item) {
					return item && item.TableRow;

				});
				newtablerow = (existingItems.length + 1).toString();
			}
			var vTableContext = vRuleDataTable.getContextByIndex(vSelectedIndex);
			var data = vRuleDataTable.getModel("JM_RuleData").getProperty(vTableContext.getPath());
			vSelectedData.push(data);
			var oModelAData = JSON.parse(JSON.stringify(vSelectedData));
			oModelAData[0].RuleId = vnewruleid;
			oModelAData[0].TableRow = newtablerow;
			oModelAData[0].isNew = true;
			for (var i = 0; i < oModelAData[0].Input.length; i++) {
				oModelAData[0].Input[i].RuleId = vnewruleid;

				if (this.fnCheckTableUi()) {
					oModelAData[0].Input[i].TableRow = "";
				} else {
					oModelAData[0].Input[i].TableRow = newtablerow;
				}
			}
			var oModel = this.getView().getModel("JM_RuleData");
			var aData = oModel.getProperty("/");
			aData.push.apply(aData, oModelAData);

			oModel.setProperty("/", aData);
			this.hasUnsavedChanges = true;
			var vNewIndex = aData.length - 1;
			vRuleDataTable.setSelectedIndex(vNewIndex);
			vRuleDataTable.setFirstVisibleRow(vNewIndex);
		},
		/**************************Copy Rule Data******************************/

		/**************************Save Rule Data******************************/
		fnSaveRuleData: function() {
			if (!this.fnValidateRuleInputs() || !this.fnCheckDuplicates()) {
				return;
			}
			var vConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you sure you want to save?",
				positiveText: "Yes",
				negativeText: "No",
				positiveIcon: "Apply.svg",
				negativeIcon: "Cancel.svg",
				action: "RuleDataSave"
			});
			this.getView().setModel(vConfirmModel, "JM_Confirm");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.Fragment.ConfirmationRules", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},
		fnRuleDataSave: function() {
			var vData = this.getView().getModel("JM_RuleData").getData();
			var ResArr = [];

			for (var i = 0; i < vData.length; i++) {
				var vrule = vData[i];

				var vinputRows = vrule.Input;

				if (Array.isArray(vinputRows) && vinputRows.length > 0) {
					for (var j = 0; j < vinputRows.length; j++) {
						ResArr.push(vinputRows[j]);
					}
				}

				ResArr.push({
					"RuleId": vrule.RuleId,
					"RuleSetId": vrule.RuleSetId,
					"Fnm": vrule.Fnm,
					"Value": vrule.Value,
					"RuleText": vrule.RuleText,
					"Ftype": vrule.Ftype,
					"FmmDes": vrule.FmmDes,
					"FnmId": vrule.FnmId,
					"TableRow": vrule.TableRow,
					"ChangeInd": vrule.ChangeInd ? "X" : ""
				});
			}

			var that = this;
			var vNavh = {
				"Flag": 'I',
				"NavRuleI": ResArr
			};
			var vModel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			vModel.create("/DeepRuleSet", vNavh, {
				success: function() {
					busyDialog.close();
					ErrorHandler.showCustomSnackbar("RuleData Saved Successfully", "success", that);
					that.hasUnsavedChanges = false;
					that.getView().getModel("JM_Enabled").setProperty("/Create", true);
					that.getView().getModel("JM_Enabled").setProperty("/Add", false);
					that.getView().getModel("JM_Enabled").setProperty("/Remove", false);

				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
				}.bind(this)

			});
		},
		/**************************Save Rule Data******************************/

		/**************************Delete Rule Data******************************/
		fnRemoveRuleData: function() {
			var vRuledataTable = this.getView().byId("id_datatable");
			var vSelectedIndex = vRuledataTable.getSelectedIndex();
			if (vSelectedIndex === -1) {
				ErrorHandler.showCustomSnackbar("Please select a RuleData to procceed", "Information", this);
				return;
			}
			var vContext = vRuledataTable.getContextByIndex(vSelectedIndex).getPath().split('/');
			if (vContext.length !== 2) {
				ErrorHandler.showCustomSnackbar("Please select a main ruleitem to procced", "Information", this);
				return;

			}
			var vTableContext = vRuledataTable.getContextByIndex(vSelectedIndex);
			var data = vRuledataTable.getModel("JM_RuleData").getProperty(vTableContext.getPath());
			var vAllData = vRuledataTable.getModel("JM_RuleData").getProperty("/");

			if (data.TableRow !== "00") {
				if (vSelectedIndex !== vAllData.length - 1) {
					ErrorHandler.showCustomSnackbar("You can only delete the last ruleitem in order", "Warning", this);
					return;
				}

			}
			var vConfirmModel = new sap.ui.model.json.JSONModel({
				headerText: "Confirmation",
				confirmationText: "Are you sure you want to Delete?",
				positiveText: "Yes",
				negativeText: "No",
				positiveIcon: "Apply.svg",
				negativeIcon: "Cancel.svg",
				action: "DeleteRuleData"
			});
			this.getView().setModel(vConfirmModel, "JM_Confirm");
			if (!this.confirmfrag) {
				this.confirmfrag = sap.ui.xmlfragment("WorkflowRules.Fragment.ConfirmationRules", this);
				this.getView().addDependent(this.confirmfrag);

			}
			this.confirmfrag.open();
		},
		fnDeleteRuleData: function(oEvent) {
			var vRuledataTable = this.getView().byId("id_datatable");
			var vSelectedIndex = vRuledataTable.getSelectedIndex();
			var vTableContext = vRuledataTable.getContextByIndex(vSelectedIndex);
			var data = [];
			data.push(vRuledataTable.getModel("JM_RuleData").getProperty(vTableContext.getPath()));
			var ResArr = [];
			for (var i = 0; i < data.length; i++) {
				if (data[i].Input && data[i].Input.length !== 0) {
					for (var j = 0; j < data[i].Input.length; j++) {
						ResArr.push(data[i].Input[j]);
					}
				}

				ResArr.push({
					"RuleId": data[i].RuleId,
					"RuleSetId": data[i].RuleSetId,
					"Fnm": data[i].Fnm,
					"Value": data[i].Value,
					"RuleText": data[i].RuleText,
					"Ftype": data[i].Ftype,
					"FmmDes": data[i].FmmDes,
					"FnmId": data[i].FnmId,
					"TableRow": data[i].TableRow,
					// "ChangeInd": data[i].ChangeInd

				});
			}
			var vNavh = {
				"Flag": "L",
				"NavRuleI": ResArr
			};
			var that = this;
			var vModel = this.getOwnerComponent().getModel("JMConfig");
			busyDialog.open();
			vModel.create("/DeepRuleSet", vNavh, {
				success: function() {
					busyDialog.close();
					ErrorHandler.showCustomSnackbar("Rule Data deleted Successfully", "success", that);
					that.fnProcessSelection(oEvent);
					that.fnCheckTable();

				},
				error: function(oError) {
					busyDialog.close();
					ErrorHandler.showCustomSnackbar("Error Occured while deleting RuleData", "Error", that);
				}
			});

		},

		/**************************Delete Rule Data******************************/

		/**************************Toggle Button Enable Mode based on Deletion mode*****************************/
		fnCheckTable: function() {
			var vRuleDataModel = this.getView().getModel("JM_RuleData");
			var aData = vRuleDataModel.getProperty("/");
			if (!aData || aData.length === 0) {
				this.getView().getModel("JM_Enabled").setProperty("/canCreateRule", true);
				this.getView().getModel("JM_Enabled").setProperty("/Add", false);
				this.getView().getModel("JM_Enabled").setProperty("/Remove", false);
				this.getView().getModel("JM_Enabled").setProperty("/Save", false);
				this.getView().getModel("JM_Enabled").setProperty("/Delete", false);
				this.getView().getModel("JM_Enabled").setProperty("/Refresh", false);
				this.getView().getModel("JM_Enabled").setProperty("/Copy", false);
			} else if (aData.length === 1) {
				this.getView().getModel("JM_Enabled").setProperty("/Add", true);
				this.getView().getModel("JM_Enabled").setProperty("/Remove", true);
			}
		},
		/**************************Toggle Button Enable Mode based on Deletion mode*****************************/

		// convert values to UpperCase
		fnUpperCase: function(oEvent) {
			var input = oEvent.getSource();
			input.setValue(input.getValue().toUpperCase());
		},
		// Validations required for rule Data 
		fnValidateRuleInputs: function() {
			var vRuleData = this.getView().getModel("JM_RuleData").getData();
			for (var i = 0; i < vRuleData.length; i++) {
				var vRule = vRuleData[i];
				var vInput = vRule.Input;
				if (!vRule.Value || vRule.Value.trim() === "") {
					ErrorHandler.showCustomSnackbar("Please Fill the Value field in Rule Data", "Warning", this);
					return false;
				}
				if (Array.isArray(vInput) && vInput.length > 0) {
					for (var j = 0; j < vInput.length; j++) {
						var vChild = vInput[j];
						var vAllowEmpty = vChild.RuleText === "No" && vInput.length === 1;
						if (!vChild.Fnm || vChild.Value.trim() === "" || (!vAllowEmpty && !vChild.Value) || (!vAllowEmpty && vChild.Value.trim() ===
								"")) {
							ErrorHandler.showCustomSnackbar("Please fill all the child rows", "Warning", this);
							return false;
						}
					}
				}
			}
			return true;
		},
		fnCheckDuplicates: function() {
			var vRuleData = this.getView().getModel("JM_RuleData").getData();
			if (!Array.isArray(vRuleData) || vRuleData.length === 0) {
				return true;
			}

			function norm(v) {
				return (v || "").toString().trim().toLowerCase();
			}

			var groupSet = new Set();
			var anyIncomplete = false;

			for (var i = 0; i < vRuleData.length; i++) {
				var rule = vRuleData[i];
				var parentVal = norm(rule.Value);

				// if parent not present -> group incomplete
				if (!parentVal) {
					anyIncomplete = true;
					continue; // skip duplicate check for this group
				}

				var childVals = [];
				if (Array.isArray(rule.Input) && rule.Input.length > 0) {
					for (var j = 0; j < rule.Input.length; j++) {
						var ch = rule.Input[j];
						var chVal = norm(ch.Value);
						if (!chVal) {
							anyIncomplete = true; // child missing => group incomplete
						}
						childVals.push(chVal);
					}
				}

				var groupComplete = parentVal !== "" && childVals.every(function(cv) {
					return cv !== "";
				});

				if (!groupComplete) {
					anyIncomplete = true;
					continue;
				}

				var sortedChildren = childVals.slice().sort(); // copy then sort
				var groupKey = JSON.stringify([parentVal, sortedChildren]);

				if (groupSet.has(groupKey)) {
					var displayParent = rule.Value || parentVal;
					var displayChildren = (Array.isArray(rule.Input) && rule.Input.length > 0) ? rule.Input.map(function(ch) {
						return ch.Value || "";
					}).join(", ") : "";
					var msg = displayChildren ?
						"Duplicate group found: '" + displayParent + "' with children [" + displayChildren + "]" :
						"Duplicate group found: '" + displayParent + "'";
					ErrorHandler.showCustomSnackbar(msg, "Error", this);
					return false;
				}

				groupSet.add(groupKey);
			}

			// If there are incomplete groups, do not show success message — only check duplicates among complete groups.
			if (anyIncomplete) {

				return true;
			}
			return true;
		},
		/*********************	Confirmation popup*******************************/
		fnConfirmSubmit: function() {
			var vModel = this.getView().getModel("JM_Confirm");
			var vAction = vModel.getProperty("/action");
			this.confirmfrag.close();
			switch (vAction) {
				case "SaveRuleSet":
					this.fnRulesetSave();
					break;
				case "DeleteRuleSet":
					this.fnDeleteRuleSet();
					break;
				case "DeleteRuleData":
					this.fnDeleteRuleData();
					break;
				case "RuleDataSave":
					this.fnRuleDataSave();
					break;
				case "UnsavedData":
					this.fnUnsavedPopup();
					break;
			}
		},
		fnConfirmExit: function() {
			var vModel = this.getView().getModel("JM_Confirm");
			var vAction = vModel.getProperty("/action");
			if (vAction === "UnsavedData") {
				var oTable = this.getView().byId("id_ruleTable");
				oTable.setSelectedIndex(this.previndex);
			}

			this.confirmfrag.close();
		},
		/*********************	Confirmation popup*******************************/

		/*********************	Custom Snackbar functionality*******************************/
		createSnackbar: function() {
			if (this._snackbar) {
				return; // Already created
			}

			this._snackbar = new sap.m.VBox({
				alignItems: "Center",
				justifyContent: "Center"
			}).addStyleClass("cl_recustomSnackbar cl_rehideMessage").placeAt("content");
		},
		showCustomSnackbar: function(sMessage, sType) {
			var that = this;
			this.createSnackbar();

			// Clear previous content
			this._snackbar.removeAllItems();
			this._snackbar.removeStyleClass("");
			this._snackbar.addStyleClass("cl_recustomSnackbar cl_rehideMessage");

			// Determine style and icon

			var sSubheading = "";
			var sTitlestyle = "";

			var sIcon = "";
			switch (sType) {
				case "success":
					sSubheading = "cl_snackbar_subhedding_s";
					sTitlestyle = "cl_msgBoxTitle_s";
					sIcon = "Image/snackbarsucess.svg";
					break;
				case "Error":
					sSubheading = "cl_snackbar_subhedding_e";
					sTitlestyle = "cl_msgBoxTitle_e";
					sIcon = "Image/snackbarerror.svg";
					break;
				case "Warning":
					sSubheading = "cl_snackbar_subhedding_w";
					sTitlestyle = "cl_msgBoxTitle_w";
					sIcon = "Image/snackbarwarning.svg";
					break;
				case "info":
				case "Information":
				default:
					sSubheading = "cl_snackbar_subhedding_i";
					sTitlestyle = "cl_msgBoxTitle_i";
					sIcon = "Image/snackbarinformation.svg";
					break;
			}
			var oIcon = new sap.m.Image({
				src: sIcon,
				width: "31px"
			}).addStyleClass("cl_resnackbarIcon");

			var oLeftVBox = new sap.m.VBox({
				alignItems: "Center",
				justifyContent: "Center",
				width: "3.5rem",
				items: [oIcon]
			});

			// RIGHT VBox with 2 HBoxes (title + message)
			var oTitle = new sap.m.Text({
				text: sType
			}).addStyleClass(sTitlestyle);

			var oMessage = new sap.m.Text({
				text: sMessage
			}).addStyleClass("cl_remsgBoxMessage");

			var oTitleHBox = new sap.m.HBox({
				items: [oTitle]
			});

			var oMessageHBox = new sap.m.HBox({
				items: [oMessage]
			});

			var oRightVBox = new sap.m.VBox({
				items: [oTitleHBox, oMessageHBox]
			});

			var oHBox = new sap.m.HBox({
				alignItems: "Center",
				height: "2.5rem",
				justifyContent: "Center",
				items: [oLeftVBox, oRightVBox]
			}).addStyleClass(sSubheading);

			this._snackbar.addItem(oHBox);

			// Show with animation
			this._snackbar.setVisible(true);
			this._snackbar.removeStyleClass("cl_rehideMessage");
			this._snackbar.addStyleClass("cl_reshowMessage");

			// Hide after timeout
			setTimeout(function() {
				this._snackbar.removeStyleClass("cl_reshowMessage");
				this._snackbar.addStyleClass("cl_rehideMessage");
			}.bind(this), 4000);
		},
		/*********************	Custom Snackbar functionality*******************************/

		/*********************** Navigation Functionalities********************************/
		fnNavigateToView: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];
			// to navigate to the UWL screen
			if (id === "id_uwl") {
				// sap.ui.core.UIComponent.getRouterFor(this).navTo("UWL");
				sap.m.URLHelper.redirect(
					"http://hd1sap.exalca.com:8000/sap/bc/ui5_ui5/sap/zmds_mm/webapp/index.html?sap-client=300&sap-ui-language=EN&sap-ui-xx-devmode=true#/UWL",
					false);
			}
			if (id === "id_material") {
				// sap.ui.core.UIComponent.getRouterFor(this).navTo("search");
				sap.m.URLHelper.redirect(
					"http://hd1sap.exalca.com:8000/sap/bc/ui5_ui5/sap/zmds_mm/webapp/index.html?sap-client=300&sap-ui-language=EN&sap-ui-xx-devmode=true#",
					false);
			}
			if (id === "id_pcn") {
				// sap.ui.core.UIComponent.getRouterFor(this).navTo("search");
				sap.m.URLHelper.redirect(
					"http://hd1sap.exalca.com:8000/sap/bc/ui5_ui5/sap/zmdm_pcn_app/webapp/index.html?sap-client=300&sap-ui-language=EN&sap-ui-xx-devmode=true#/",
					false);
			}
			if (id === "id_dashBoard") {

				// sap.ui.core.UIComponent.getRouterFor(this).navTo("Dashboard");
				sap.m.URLHelper.redirect(
					"http://hd1sap.exalca.com:8000/sap/bc/ui5_ui5/sap/zmds_mm/webapp/index.html?sap-client=300&sap-ui-language=EN&sap-ui-xx-devmode=true#/Dashboard",
					false);
			}
			if (id === "id_workFlow") {
				// Absolute URL of the deployed app
				sap.m.URLHelper.redirect(
					"http://hd1sap.exalca.com:8000/sap/bc/ui5_ui5/sap/zmdm_search/webapp/index.html?sap-client=300&sap-ui-language=EN&sap-ui-xx-devmode=true",
					false);
			}
			if (id === "id_WorkflowRules") {
				sap.m.URLHelper.redirect(
					"http://hd1sap.exalca.com:8000/sap/bc/ui5_ui5/sap/zmaintain_rules/webapp/index.html?sap-client=300&sap-ui-language=EN&sap-ui-xx-devmode=true",
					false);
			}
		},
		fnNavExpandList: function(oEvent) {
			var id = oEvent.getSource().getId().split("--")[1];

			if (id === "id_appList") {
				this.getView().byId("id_appList_i").setVisible(true);
			}

		},
		/*********************** Navigation Functionalities********************************/
		fnNavBack: function() { // Added by srikanth
			sap.ui.core.UIComponent.getRouterFor(this).navTo("HomePage");
		},

	});

});