sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"WorkflowRules/controller/ErrorHandler",
	"sap/ui/model/resource/ResourceModel"
], function(Controller, ErrorHandler, ResourceModel) {
	"use strict";
	
	var busyDialog = new sap.m.BusyDialog();

	return Controller.extend("WorkflowRules.controller.HomePage", {
		
		onInit: function() {

			// ********************* IMAGE MODEL ************************
			var vPathImage = jQuery.sap.getModulePath("WorkflowRules") + "/Image/";
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: vPathImage
			});
			this.getView().setModel(oImageModel, "JM_ImageModel");

			// **********************************************************

			this.f4Cache = {};
			// var i18nModel = new ResourceModel({
			// 	bundleName: "UWL_DASHBOARD.i18n.i18n"
			// });
			// this.getView().setModel(i18nModel, "i18n");

			// i18n = this.getView().getModel("i18n").getResourceBundle();
			// busyDialog.open();
			var oUsernameSet = this.getOwnerComponent().getModel("JMConfig");
			oUsernameSet.read("/UsernameSet", {
				success: function(odata) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData({
						Uname: odata.results[0].Uname,
						Sysid: odata.results[0].Agent,
						id: odata.results[0].Sysid
					});
					this.getView().setModel(oJsonModel, "JM_UserModel");
				}.bind(this),
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error");
				}
			});
					this.byId("id_uwlPress").attachBrowserEvent("click", this.fnNavtouwl, this);
			this.byId("id_dashboard").attachBrowserEvent("click", this.fnNavtoDashboard, this);
			// this.oRouter = this.getOwnerComponent().getRouter(this);
			// this.oRouter.getRoute("home").attachPatternMatched(this.fnRouter, this);
		},
		fnNavtoDashboard:function(){
			sap.ui.core.UIComponent.getRouterFor(this).navTo("RulesEngine");
		},
		fnNavtouwl:function(){
			sap.ui.core.UIComponent.getRouterFor(this).navTo("Workflow");
		}

	});

});