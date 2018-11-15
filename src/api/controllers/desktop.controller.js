const httpStatus = require('http-status');
const {
  handler
} = require('../middlewares/error');
const { EDFAssert } = require('../utils/Assert');
const _ = require('lodash');
const moment = require('moment');
const EDF = require('../../config/EDF');
const logger = require('../utils/Logger')(module);

const defaultDesktop = {
  layouts: [],
  layoutIds: [],
  name: null,
  title: null,
  defaultLayoutId: null
};

exports.loadDesktops = async (req, res) => {
  let { desktops } = req.body;
  if (!Array.isArray(desktops)) {
    desktops = [desktops];
  }
  logger.info('[loadDesktops] Loading loadDesktops  ');
  logger.info(desktops);
  try {
    const resultArr = _.compact(await Promise.all(desktops.map(async (desktop) => {
      if (!desktop) {
        return null;
      }
      if (Number.isNaN(Number(desktop))) {
        logger.info(`[loadDesktops] Loading deskTop by name = ${desktop}`);
        const result = await EDFAssert({
          url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
          method: 'post',
          responseType: 'json',
          headers: { Authorization: req.headers.authorization },
          data: {
            userLogin: (req.user && req.user.username) || 'anonymous',
            searchParams: {
              entityName: EDF.data.desktopModelName,
              query: `[name] = '${desktop}'`
            },
            paging: {
              pageNumber: 1,
              pageSize: 99
            }
          }
        });
        return _.get(result, 'data.rows[0]');
      }
      logger.info(`[loadDesktops] Loading deskTop by ID = ${Number(desktop)}`);

      const result = await EDFAssert({
        url: `${EDF.data.coreEndpoint}/readEntityInstances`,
        method: 'post',
        responseType: 'json',
        headers: { Authorization: req.headers.authorization },
        data: {
          userLogin: (req.user && req.user.username) || 'anonymous',
          entityInstancePks: [{
            entityName: EDF.data.desktopModelName,
            entityInstanceId: Number(desktop)
          }]
        }
      });
      return _.get(result, 'data.rows[0]');
    })));

    logger.info('[loadDesktops] All desktops loaded');
    logger.info(resultArr);

    if (_.isEmpty(resultArr)) {
      logger.error('[loadDesktops] Nothing found! Returning defaultDesktop');
      res.status(httpStatus.OK);
      return res.json(defaultDesktop).end();
    }
    const layoutIds = _.uniq(_.compact(_.flatten(resultArr.map(desk =>

      _.get(desk, 'object.layoutIds', []).map(layoutPk => _.get(layoutPk, 'entityInstancePk.entityInstanceId'))))));
    logger.debug('[loadDesktops] Layout IDs finaly is:');
    logger.debug(layoutIds);

    let layouts = [];
    if (layoutIds && layoutIds.length > 0) {
      logger.debug('[loadDesktops] Getting layouts:');
      try {
        layouts = _.compact(await Promise.all(layoutIds.map(async (layoutId) => {
          try {
            const layoutSrc = await EDFAssert({
              url: `${EDF.data.coreEndpoint}/readEntityInstances`,
              method: 'post',
              responseType: 'json',
              headers: { Authorization: req.headers.authorization },
              data: {
                userLogin: (req.user && req.user.username) || 'anonymous',
                entityInstancePks: [{
                  entityName: EDF.data.layoutModelName,
                  entityInstanceId: layoutId
                }]
              }
            });
            const status = _.get(layoutSrc, 'status.type');
            logger.debug(`[loadDesktops] Layout ID = ${layoutId} loaded! Status is: ${status}`);
            if (status === 'SUCCESS') {
              const layout = _.get(layoutSrc, 'data.rows[0].object');
              layout._id = _.get(layoutSrc, 'data.rows[0].entityInstancePk.entityInstanceId');
              return layout;
            }
            return null;
          } catch (err) {
            logger.error(`[loadDesktops] Can't load layout id = ${layoutId}!`);
            logger.error(err.message);
            return null;
          }
        })));
        logger.debug('[loadDesktops] All layouts loaded for desktop!');
        logger.debug(layouts);
      } catch (err) {
        logger.error('[loadDesktops] Error loading layouts list!');
        logger.error(err.message);
        return handler(err, req, res);
      }
    }
    let defaultLayoutId;
    for (let i = 0; i < resultArr.length; i += 1) {
      if (resultArr[i].object.defaultLayoutId) {
        defaultLayoutId = Number(resultArr[i].object.defaultLayoutId);
        break;
      }
    }
    const desktopRes = {
      layouts,
      defaultLayoutId
    };
    logger.info('[loadDesktops] Desktops successfully loaded!');
    logger.info(desktopRes);
    res.status(httpStatus.OK);
    return res.json(desktopRes).end();
  } catch (err) {
    logger.error('[loadDesktops] Error loading new Desktop!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.list = async (req, res) => {
  logger.info('[list] Getting desktop list');
  try {
    const result = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        searchParams: {
          entityName: EDF.data.desktopModelName
        },
        paging: {
          pageNumber: 1,
          pageSize: 999
        }
      }
    });

    const desktopsListSrc = _.get(result, 'data.rows', []);
    const desktopsList = desktopsListSrc.map((item) => {
      const resultObject = item.object;
      resultObject._id = _.get(item, 'entityInstancePk.entityInstanceId');
      return resultObject;
    });

    logger.info('[list] Desktop list success');
    logger.debug(desktopsList);
    res.status(httpStatus.OK);
    return res.json(desktopsList).end();
  } catch (err) {
    logger.error('[list] Error getting desktop list!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.save = async (req, name, res) => {
  logger.info(`[save] Saving desktop "${name}"`);
  const now = moment().format();
  const newDesktop = Object.assign({}, req.body.data);
  newDesktop.defaultLayoutId = newDesktop.defaultLayoutId ? String(newDesktop.defaultLayoutId) : '';
  newDesktop.whoModified = (req.user && req.user.username) || 'anonymous';
  newDesktop.dateModified = now;
  newDesktop.layoutIds = newDesktop.layouts && newDesktop.layouts.map(layout => layout._id);
  delete newDesktop.layouts;

  try {
    logger.debug(`[save] Finding existing desktop "${name}"`);
    const list = await EDFAssert({
      url: `${EDF.data.coreEndpoint}/searchEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        searchParams: {
          entityName: EDF.data.desktopModelName,
          query: `name = '${name}'`
        },
        paging: {
          pageNumber: 1,
          pageSize: 999
        }
      }
    });
    const desktop = _.get(list, 'data.rows[0]');
    if (desktop) { // desktop exist
      newDesktop.dateCreated = _.get(desktop, 'object.dateCreated');
      newDesktop.whoCreated = _.get(desktop, 'object.whoCreated');
      logger.info(`[save] Owerwriting exisitng desktop "${name}"`);
      logger.debug(newDesktop);
      try {
        const result = await EDFAssert({
          url: `${EDF.data.coreEndpoint}/updateEntityInstances`,
          method: 'post',
          responseType: 'json',
          headers: { Authorization: req.headers.authorization },
          data: {
            userLogin: (req.user && req.user.username) || 'anonymous',
            entityInstances: [{
              entityInstancePk: {
                entityName: EDF.data.desktopModelName,
                entityInstanceId: _.get(desktop, 'entityInstancePk.entityInstanceId')
              },
              object: newDesktop
            }]
          }
        });
        logger.info(`[save] Desktop name=${name} successefully updated`);
        logger.debug(_.get(result, 'data.rows'));
        return res.status(httpStatus.NO_CONTENT).end();
      } catch (err) {
        logger.error(`[save] Error updating Desktop name = ${name}!`);
        logger.error(err.message);
        return handler(err, req, res);
      }
    } else { // desktop doesn't exist
      newDesktop.dateCreated = now;
      newDesktop.whoCreated = newDesktop.whoModified;
      logger.info(`[save] Creating new desktop "${name}"`);
      logger.debug(newDesktop);
      try {
        const result = await EDFAssert({
          url: `${EDF.data.coreEndpoint}/createEntityInstances`,
          method: 'post',
          responseType: 'json',
          headers: { Authorization: req.headers.authorization },
          data: {
            userLogin: (req.user && req.user.username) || 'anonymous',
            entityInstances: [{
              entityName: EDF.data.desktopModelName,
              object: newDesktop
            }]
          }
        });
        logger.info(`[save] Desktop ${name} created!`);
        logger.debug(_.get(result, 'data.rows[0]'));
        return res.status(httpStatus.NO_CONTENT).end();
      } catch (err) {
        logger.error('[save] Error creating new Desktop!');
        logger.error(err.message);
        return handler(err, req, res);
      }
    }
  } catch (err) {
    logger.error('[save] Error getting desktop list!');
    logger.error(err.message);
    return handler(err, req, res);
  }
};

exports.delete = async (req, id, res) => {
  logger.info(`[delete] Deleting desktop id = ${id}`);
  const desktopId = id;

  try {
    await EDFAssert({
      url: `${EDF.data.coreEndpoint}/deleteEntityInstances`,
      method: 'post',
      responseType: 'json',
      headers: { Authorization: req.headers.authorization },
      data: {
        userLogin: (req.user && req.user.username) || 'anonymous',
        entityInstancePks: [{
          entityName: EDF.data.desktopModelName,
          entityInstanceId: desktopId
        }]
      }
    });
    logger.info(`Desktop ID=${desktopId} successfully deleted`);
    return res.status(httpStatus.NO_CONTENT).end();
  } catch (err) {
    logger.error(`Error deleting desktop id = ${desktopId}!`);
    logger.error(err.message);
    return handler(err, req, res);
  }
};
