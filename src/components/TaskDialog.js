import { Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, ListSubheader, TextField, Typography } from "@material-ui/core";
import DeleteIcon from '@material-ui/icons/Delete';
import React from "react";
import { api } from "../api/api";
import Actions, { wrapAction } from "../components/Actions";
import { ActionTag, isActionModified } from "../components/Actions";
import Triggers, { wrapTrigger } from "../components/Triggers";
import { TriggerTag, isTriggerModified } from "../components/Triggers";
import { setErrorInfo, setTasks, updateTypes } from "../data/action";
import store from "../data/store";
import { arrayRemove, deepCopy, isObjectValueEqual, objectUpdate } from "../utils/utils";

let taskDialogUpdate = false;

export function setTaskDialogUpdate(val) { taskDialogUpdate = val; }

export default function TaskDialog(props) {
  const { addMode, open, onClose, onRefresh, onSave, targets } = props;
  const taskOld = props.taskOld === true ? null : props.taskOld;
  // console.log('targets', targets);
  const baseTaskName = (targets && targets.taskName) ? targets.taskName : '未命名任务';
  const realDefaultTask = {
    task_name: baseTaskName,
    triggers: [],
    actions: [],
  };
  const defaultTask = addMode ? (props.defaultTask ? props.defaultTask : realDefaultTask) : taskOld ? taskOld : (props.defaultTask ? props.defaultTask : realDefaultTask);
  const [state, setInnerState] = React.useState({
    dialogAddTaskOpen: false,
    dialogAddTriggerOpen: false,
    dialogAddActionOpen: false,
    dialogUpdateTrigger: false,
    task: defaultTask,
    requestingTaskData: false,
    defaultTid: null,
  });
  // console.log('baseTaskName', baseTaskName, 'defaultTask', defaultTask);
  // console.log('taskNow', state.task);
  const setState = (update) => setInnerState(objectUpdate(state, update));
  const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);
  const taskData = store.getState().types.task_data;

  // console.log('taskNow', state.task);
  if (!addMode && (taskDialogUpdate || (isObjectValueEqual(state.task, realDefaultTask) && !isObjectValueEqual(defaultTask, realDefaultTask)))) {
    taskDialogUpdate = false;
    setState({ task: defaultTask });
  } else if (taskDialogUpdate) {
    taskDialogUpdate = false;
    setState({ task: defaultTask });
  }

  if (!state.requestingTaskData && !taskData) {
    setState({ requestingTaskData: true });
    api.request("task", 'PATCH').then(resp => {
      // console.log("resp", resp);
      let taskData = resp.data.task_data;
      taskData.tid = null;
      store.dispatch(updateTypes("task_data", taskData));
      forceUpdate();
    })
  }

  const handleAddTask = addMode ? () => {
    // console.log('pass#2');
    if (!taskData) {
      setErrorInfo("Task数据为空。");
      console.error("Task数据为空。");
      return;
    }
    // const task = objectUpdate(taskData, { triggers: state.task.triggers, actions: state.task.actions, task_name: state.task.task_name, tid: null, });
    const task = objectUpdate(taskData, state.task);
    console.log('task', task);
    return api.request('task', "POST", { task }).then(resp => {
      // console.log('resp', resp);
      if (resp.code !== 200) return;
      const defaultTid = resp.data.tid ? (resp.data.tid + 1) : null;
      setState({
        defaultTid,
        taskName: store.getState().types.task_data ? `${baseTaskName}${defaultTid ? defaultTid : ""}` : baseTaskName,
      });
      onRefresh && onRefresh();
    });
  } : () => {
    if (!taskOld) return;
    const task = objectUpdate(taskOld, state.task);
    console.log('task', task);
    if (onSave)
      return onSave(task);
    else return new Promise((resolve, reject) => { resolve(); });
  };

  return <Dialog fullWidth open={open} onClose={() => { onClose && onClose() }}>
    <DialogTitle>{addMode ? "添加新任务" : "设置任务"}</DialogTitle>
    <DialogContent>
      <List>
        <ListSubheader>计划名称</ListSubheader>
        <ListItem>
          <TextField value={state.task.task_name} onChange={e => {
            let newTask = deepCopy(state.task);
            newTask.task_name = e.target.value;
            setState({ task: newTask });
          }}></TextField>
        </ListItem>
        <ListSubheader>触发器列表</ListSubheader>
        {state.task.triggers.map((trigger, k) => <ListItem key={k}>
          <TriggerTag fullWidth trigger={trigger} onSave={data => {
            console.log('saveing', data);
            let newTask = deepCopy(state.task);
            newTask.triggers[k] = data;
            setState({ task: newTask });
          }}></TriggerTag>
          <ListItemSecondaryAction>
            <IconButton onClick={() => {
              let newTask = deepCopy(state.task);
              newTask.triggers.splice(k, 1);
              setState({ task: newTask });
            }}>
              <DeleteIcon></DeleteIcon>
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>)}
        <ListSubheader>Actions列表</ListSubheader>
        {state.task.actions.map((action, k) => <ListItem key={k}>
          <ActionTag fullWidth action={action} onSave={data => {
            console.log('saveing', data);
            let newTask = deepCopy(state.task);
            newTask.actions[k] = data;
            setState({ task: newTask });
          }}></ActionTag>
          <ListItemSecondaryAction>
            <IconButton onClick={() => {
              let newTask = deepCopy(state.task);
              newTask.actions.splice(k, 1);
              setState({ task: newTask });
            }}>
              <DeleteIcon></DeleteIcon>
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>)}
        <ListItem>
          <Grid container spacing={5}>
            <Grid item xs={12} lg={6}>
              <Button fullWidth onClick={() => { setState({ dialogAddTriggerOpen: true }) }} color="primary" variant="outlined">添加触发器</Button>
            </Grid>
            <Grid item xs={12} lg={6}>
              <Button fullWidth onClick={() => { setState({ dialogAddActionOpen: true }) }} color="primary" variant="outlined">添加Action</Button>
            </Grid>
          </Grid>
        </ListItem>
      </List>
      <Dialog open={state.dialogAddTriggerOpen} onClose={() => setState({ dialogAddTriggerOpen: false })}>
        <DialogTitle>选择一个触发器</DialogTitle>
        <DialogContent>
          <Triggers targets={targets} onClick={trigger => {
            console.log("trigger", trigger);
            let newTask = deepCopy(state.task);
            newTask.triggers.push(trigger);
            setState({ dialogAddTriggerOpen: false, task: newTask });
          }} selectMode></Triggers>
        </DialogContent>
      </Dialog>
      <Dialog open={state.dialogAddActionOpen} onClose={() => setState({ dialogAddActionOpen: false })}>
        <DialogTitle>选择一个Action</DialogTitle>
        <DialogContent>
          <Actions targets={targets} onClick={action => {
            console.log("action", action);
            let newTask = deepCopy(state.task);
            newTask.actions.push(action);
            setState({ dialogAddActionOpen: false, task: newTask });
          }} selectMode></Actions>
        </DialogContent>
      </Dialog>
    </DialogContent>
    <DialogActions>
      <Button color="primary" disabled={state.task.triggers.length === 0 || state.task.actions.length === 0} onClick={async () => {
        // console.log('pass#1');
        handleAddTask().then(() => {
          setState({ task: defaultTask });
          onClose && onClose();
        });
      }}>确定</Button>
      <Button onClick={() => { onClose && onClose(); }}>取消</Button>
    </DialogActions>
  </Dialog >;
}