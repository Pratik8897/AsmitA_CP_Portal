import AdminLayout from "../components/AdminLayout";
import DataTable from "../components/DataTable";

const LeadActivities = () => {
  return (
    <AdminLayout title="Lead Activities" subtitle="All lead activity records">
      <DataTable
        title="Lead Activities"
        endpoint="/api/lead-activities"
        columnLabels={{
          id: "Activity ID",
          lead_id: "Lead ID",
          leadId: "Lead ID",
          activity_type: "Activity Type",
          type: "Activity Type",
          action: "Action",
          description: "Description",
          notes: "Notes",
          remarks: "Remarks",
          status: "Status",
          created_by: "Created By",
          created_by_id: "Created By",
          user_id: "User ID",
          created_at: "Created At",
          activity_at: "Activity At",
          logged_at: "Logged At",
        }}
        showActions={false}
        viewExclude={["id"]}
      />
    </AdminLayout>
  );
};

export default LeadActivities;
