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
  ListGuesser,
  DateField,
  CardActions,
  CREATE,
} from "react-admin";
import { refreshView as refreshViewAction } from "ra-core";
import { connect } from "react-redux";
import { createAuthProvider } from "@data-proxy/react-admin-provider";
import Button from "@material-ui/core/Button";
import LoginPage from "./LoginPage";
import { dataProvider } from "./dataProvider";
import { CircularProgress } from "@material-ui/core";
import { CheckCircle, HighlightOff } from "@material-ui/icons";

const authProvider = createAuthProvider({
  projectId: process.env.GITLAB_PROJECT_ID,
  host: process.env.REACT_ADMIN_DATA_API,
});

const UserList = props => (
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

const UserEdit = props => (
  <Edit {...props}>
    <SimpleForm>
      <BooleanInput source="active" />
      <TextInput source="name" />
    </SimpleForm>
  </Edit>
);

const UserCreate = props => (
  <Create {...props}>
    <SimpleForm>
      <BooleanInput source="active" />
      <TextInput source="name" />
    </SimpleForm>
  </Create>
);

const PipelineListActions = connect(
  null,
  { refreshView: refreshViewAction },
)(({ refreshView }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshView();
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <CardActions>
      <Button
        color="primary"
        disabled={loading}
        onClick={async () => {
          if (loading) {
            return;
          }
          try {
            setLoading(true);
            await dataProvider(CREATE, "pipelines");
            refreshView();
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        }}
      >
        Trigger pipeline
      </Button>
    </CardActions>
  );
});
const PipelineStatusField = ({ record = {}, source }) =>
  record[source] === "success" ? (
    <CheckCircle color="primary" />
  ) : record[source] === "pending" || record[source] === "running" ? (
    <CircularProgress size={20} />
  ) : (
    <HighlightOff color="error" />
  );
export const PipelineList = props => (
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
  <Admin
    dataProvider={dataProvider}
    authProvider={authProvider}
    loginPage={LoginPage}
  >
    <Resource
      name="users"
      list={UserList}
      edit={UserEdit}
      create={UserCreate}
    />
    <Resource name="pipelines" list={PipelineList} />
  </Admin>
);

export default App;
