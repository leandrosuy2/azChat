const rules = {
	user: {
		static: [
			"tickets-manager:showall",
			"quickMessages:view",
			"quickMessages:create",
			"quickMessages:edit",
			"kanban:view",
			"kanban:moveCard",
		],
	},

	admin: {
		static: [
			"dashboard:view",
			"drawer-admin-items:view",
			"tickets-manager:showall",
			"user-modal:editProfile",
			"user-modal:editQueues",
			"ticket-options:deleteTicket",
			"contacts-page:deleteContact",
			"connections-page:actionButtons",
			"connections-page:addConnection",
			"connections-page:editOrDeleteConnection",
			"tickets-manager:closeAll",
			"quickMessages:view",
			"quickMessages:create",
			"quickMessages:edit",
			"quickMessages:delete",
			"kanban:view",
			"kanban:create",
			"kanban:edit",
			"kanban:delete",
			"kanban:moveCard",
		],
	},
};

export default rules;
