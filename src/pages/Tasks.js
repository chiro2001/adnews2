import { Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, ListSubheader, TextField, Typography } from "@material-ui/core";
import DeleteIcon from '@material-ui/icons/Delete';
import React from "react";
import { api } from "../api/api";
import Actions, { wrapAction } from "../components/Actions";
import { ActionTag, isActionModified } from "../components/Actions";
import TaskDialog, { setTaskDialogUpdate } from "../components/TaskDialog";
import Triggers, { wrapTrigger } from "../components/Triggers";
import { TriggerTag, isTriggerModified } from "../components/Triggers";
import { setErrorInfo, setTasks, updateTypes } from "../data/action";
import store from "../data/store";
import { arrayRemove, deepCopy, isObjectValueEqual, objectUpdate } from "../utils/utils";


async function wrapTask(task) {
  const taskData = store.getState().types.task_data;
  if (!taskData) return;
  let taskWrapped = objectUpdate(taskData, task);
  // taskWrapped.triggers = taskWrapped.triggers.map(async trigger => await wrapTrigger(trigger));
  for (let i = 0; i < taskWrapped.triggers.length; i++)
    taskWrapped.triggers[i] = await wrapTrigger(taskWrapped.triggers[i]);
  // taskWrapped.actions = taskWrapped.actions.map(async action => await wrapAction(action));
  for (let i = 0; i < taskWrapped.actions.length; i++)
    taskWrapped.actions[i] = await wrapAction(taskWrapped.actions[i]);
  if (taskWrapped.triggers.includes(null) || taskWrapped.actions.includes(null)) return null;
  return taskWrapped;
}


function TaskTag(props) {
  const { task, onUpdate, onClick } = props;
  // return <code>{JSON.stringify(task)}</code>;
  return <ListItem button onClick={async () => {
    if (!onClick) return;
    console.log('task before', task);
    const taskWrapped = await wrapTask(task);
    console.log('task after', taskWrapped);
    taskWrapped && onClick && onClick(taskWrapped);
  }}>
    <ListItemText>
      <Box>
        <Typography variant="h5">{task.task_name}</Typography>
      </Box>
      <Box>
        <Typography variant="body2">{`tid:${task.tid}/?????????:${task.triggers.length}/Action:${task.actions.length}`}</Typography>
      </Box>
    </ListItemText>
    <ListItemSecondaryAction>
      <IconButton onClick={() => {
        api.request_key("task", task.tid, "DELETE").then(resp => {
          if (resp.code !== 200) store.dispatch(setErrorInfo(resp));
          onUpdate && onUpdate();
        });
      }}>
        <DeleteIcon></DeleteIcon>
      </IconButton>
    </ListItemSecondaryAction>
  </ListItem>
}

export function getTargetTasks(targets) {
  const tasks = store.getState().tasks;
  if (!targets || !targets.roomItem || (targets.roomItem && JSON.stringify(targets.roomItem) === "{}")) return tasks;
  let result = [];
  for (const task of tasks) {
    for (const action of task.actions) {
      if (!action) return [];
      const target = action.data ? action.data : action;
      // console.log('target', target, 'require', targets);
      if (target.action_type === "adjust_price") {
        if (targets.roomItem && target.item_id === targets.roomItem.itemId) {
          result.push(task);
          break;
        }
      }
    }
  }
  // if (result.length > 0) {
  //   console.log("getTargetTasks", result, targets, tasks);
  //   // debugger;
  // }
  return result;
}

export function getTargetTasksMarks(targets) {
  if (targets) console.log(targets);
  const tasks = store.getState().tasks;
  const marks = tasks.map((task, k) => {
    for (const action of task.actions) {
      const target = action.data ? action.data : action;
      if (target.action_type === "adjust_price") {
        if (targets && targets.roomItem && target.item_id === targets.roomItem.itemId) {
          console.log('found', task);
          return true;
        } else if (!targets) return true;
      }
    }
    return false;
  });
  // if (!targets || !targets.roomItem || (targets.roomItem && JSON.stringify(targets.roomItem) === "{}")) return tasks;
  // let result = [];
  // for (const task of tasks) {
  //   for (const action of task.actions) {
  //     const target = action.data ? action.data : action;
  //     if (target.action_type === "adjust_price") {
  //       if (targets.roomItem && target.item_id === targets.roomItem.itemId) {
  //         result.push(task);
  //         break;
  //       }
  //     }
  //   }
  // }
  // if (result.length > 0)
  //   console.log("getTargetTasks", result, targets, tasks);
  // return result;
  return marks;
}

export function TaskList(props) {
  const { onClick, onUpdate, targets, fullWidth } = props;
  // const tasks = getTargetTasks(targets);
  const tasks = props.tasks ? props.tasks : store.getState().tasks;
  const marks = props.tasks ? getTargetTasksMarks(null) : getTargetTasksMarks(targets);
  if (targets && targets.roomItem && JSON.stringify(targets.roomItem) !== "{}") console.log('tasks', targets, tasks);
  // if (tasks.length > 0) console.log(tasks, marks);
  return tasks.length > 0 ? <List>
    {tasks.map((task, k) => marks[k] ? <TaskTag onClick={onClick} onUpdate={onUpdate} key={k} task={task}></TaskTag> : null)}
  </List> : <List style={{ width: fullWidth ? "100%" : null }}>
    <ListItem>
      <Typography variant="body1" color="textSecondary">?????????</Typography>
    </ListItem>
  </List>
}

export default function Tasks(props) {
  const [state, setInnerState] = React.useState({
    requestingTasks: false,
    dialogAddTaskOpen: false,
    addMode: true,
    task: null,
  });
  const tasks = store.getState().tasks;
  const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);
  const setState = (update) => setInnerState(objectUpdate(state, update));

  if (!state.requestingTasks) {
    setState({ requestingTasks: true });
    api.request("task", "GET").then(resp => {
      if (resp.code !== 200) {
        store.dispatch(setErrorInfo(resp));
        return;
      }
      store.dispatch(setTasks(resp.data.tasks));
      forceUpdate();
    });
  }

  return <Container>
    <Grid container spacing={3}>
      <Grid item lg={8} sm={12}>
        <Typography variant="h4">????????????</Typography>
        {/* {tasks.length > 0 ? <List>
          {tasks.map((task, k) => <TaskTag onClick={task => {
            console.log('Task: onClick', task);
            setTaskDialogUpdate(true);
            setState({ dialogAddTaskOpen: true, addMode: false, task });
          }} onUpdate={() => { setState({ requestingTasks: false }); }} key={k} task={task}></TaskTag>)}
        </List> : <List>
          <ListItem>
            <Typography variant="body1" color="textSecondary">?????????</Typography>
          </ListItem>
        </List>} */}
        <TaskList onClick={task => {
          console.log('Task: onClick', task);
          setTaskDialogUpdate(true);
          setState({ dialogAddTaskOpen: true, addMode: false, task });
        }} onUpdate={() => { setState({ requestingTasks: false }); }}></TaskList>
      </Grid>
      <Grid item lg={4} sm={12}>
        <Container maxWidth="xs">
          <List>
            <ListSubheader>?????????</ListSubheader>
            <ListItem>
              <Button fullWidth variant="contained" color="secondary" onClick={() => {
                setTaskDialogUpdate(true);
                setState({ dialogAddTaskOpen: true, addMode: true });
              }}>???????????????</Button>
            </ListItem>
            <ListItem>
              <Button fullWidth variant="contained">??????????????????</Button>
            </ListItem>

            <ListSubheader>??????????????????</ListSubheader>
            <ListItem>
              <Button fullWidth disabled={tasks.length === 0} variant="outlined" onClick={() => {
                let tids = {};
                tasks.map(task => { tids = Object.assign(tids, { [task.tid]: task.tid }); return null; });
                api.request("task", "DELETE", { tids }).then(resp => {
                  // forceUpdate();
                  setState({ requestingTasks: false });
                });
              }}>??????????????????</Button>
            </ListItem>
          </List>
        </Container>
      </Grid>
    </Grid>
    <TaskDialog taskOld={state.task}
      addMode={state.addMode}
      open={state.dialogAddTaskOpen}
      onRefresh={() => { setState({ requestingTasks: false }); }}
      onClose={() => { setState({ dialogAddTaskOpen: false }); }}
      onSave={task => {
        return api.request_key('task', task.tid, "POST", { task }).then(resp => {
          setState({ requestingTasks: false });
        });
      }}
    ></TaskDialog>
  </Container >
}