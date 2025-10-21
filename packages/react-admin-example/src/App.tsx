import React, { useState, useEffect } from "react";
import {
  Admin,
  Resource,
  List,
  Datagrid,
  TextField,
  BooleanField,
  EditButton,
  DeleteButton,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  DateField,
  CREATE,
  ListProps,
  EditProps,
  CreateProps,
  TopToolbar,
  useRefresh,
  RaRecord,
} from "react-admin";
import { createAuthProvider } from "@data-proxy/react-admin-provider";
import { dataProvider } from "./dataProvider";
import { Button, CircularProgress } from "@mui/material";
import { CheckCircle, HighlightOff } from "@mui/icons-material";

const authProvider = createAuthProvider({
  projectId: process.env.GIT_PROJECT_ID || "",
  host: process.env.REACT_ADMIN_DATA_API || "",
});

const UserList = (props: ListProps) => (
  <List {...props}>
    <Datagrid rowClick="edit">
      {/* <TextField source="id" /> */}
      <BooleanField source="active" />
      <TextField source="name" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

const UserEdit = (props: EditProps) => (
  <Edit {...props}>
    <SimpleForm>
      <BooleanInput source="active" />
      <TextInput source="name" />
    </SimpleForm>
  </Edit>
);

const UserCreate = (props: CreateProps) => (
  <Create {...props}>
    <SimpleForm>
      <BooleanInput source="active" />
      <TextInput source="name" />
    </SimpleForm>
  </Create>
);

const ArticleList = (props: ListProps) => (
  <List {...props}>
    <Datagrid rowClick="edit">
      {/* <TextField source="id" /> */}
      <BooleanField source="active" />
      <TextField source="title" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

const ArticleEdit = (props: EditProps) => (
  <Edit {...props}>
    <SimpleForm>
      <BooleanInput source="active" />
      <TextInput source="title" />
    </SimpleForm>
  </Edit>
);

const ArticleCreate = (props: CreateProps) => (
  <Create {...props}>
    <SimpleForm>
      <BooleanInput source="active" />
      <TextInput source="title" />
    </SimpleForm>
  </Create>
);

const PipelineListActions = () => {
  const [loading, setLoading] = useState(false);
  const refresh = useRefresh();

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <TopToolbar>
      <Button
        color="primary"
        disabled={loading}
        onClick={async () => {
          if (loading) {
            return;
          }
          try {
            setLoading(true);
            await dataProvider(CREATE, "pipelines", {});
            refresh();
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        }}
      >
        Trigger pipeline
      </Button>
    </TopToolbar>
  );
};
const PipelineStatusField = ({
  record,
  source,
}: {
  record?: RaRecord;
  source: string;
}) =>
  record?.[source] === "success" ? (
    <CheckCircle color="primary" />
  ) : record?.[source] === "pending" || record?.[source] === "running" ? (
    <CircularProgress size={20} />
  ) : (
    <HighlightOff color="error" />
  );
export const PipelineList = (props: ListProps) => (
  <List {...props} actions={<PipelineListActions />}>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <PipelineStatusField source="status" />
      <DateField source="created_at" />
      <DateField source="updated_at" />
      <DateField source="started_at" />
      <DateField source="finished_at" />
      <TextField source="committed_at" />
      <TextField source="duration" />
    </Datagrid>
  </List>
);

const App = () => (
  <Admin dataProvider={dataProvider} authProvider={authProvider()}>
    {(permissions) => {
      return [
        <Resource
          name="users"
          list={UserList}
          edit={UserEdit}
          create={UserCreate}
        />,
        permissions.includes("admin") ? (
          <Resource
            name="articles"
            list={ArticleList}
            edit={ArticleEdit}
            create={ArticleCreate}
          />
        ) : null,
        <Resource name="pipelines" list={PipelineList} />,
      ];
    }}
  </Admin>
);

export default App;
