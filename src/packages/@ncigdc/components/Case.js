// @flow

import React from "react";
import { compose } from "recompose";
import JSURL from "jsurl";
import { connect } from "react-redux";

import withRouter from "@ncigdc/utils/withRouter";
import { makeFilter, mergeQuery } from "@ncigdc/utils/filters";
import {
  EXPERIMENTAL_STRATEGIES,
  DATA_CATEGORIES
} from "@ncigdc/utils/constants";
import { removeEmptyKeys } from "@ncigdc/utils/uri";
import Column from "@ncigdc/uikit/Flex/Column";
import Row from "@ncigdc/uikit/Flex/Row";
import CountCard from "@ncigdc/components/CountCard";
import SummaryCard from "@ncigdc/components/SummaryCard";
import EntityPageVerticalTable
  from "@ncigdc/components/EntityPageVerticalTable";
import ClinicalCard from "@ncigdc/components/ClinicalCard";
import BiospecimenCard from "@ncigdc/components/BiospecimenCard";
import { withTheme } from "@ncigdc/theme";
import { RepositoryFilesLink } from "@ncigdc/components/Links/RepositoryLink";
import ProjectLink from "@ncigdc/components/Links/ProjectLink";
import Button from "@ncigdc/uikit/Button";
import { removeFilesFromCart, addAllFilesInCart } from "@ncigdc/dux/cart";
import SsmsBarChart from "@ncigdc/modern_components/SsmsBarChart/SsmsBarChart";
import SsmsTable from "@ncigdc/modern_components/SsmsTable/SsmsTable";
import FileIcon from "@ncigdc/theme/icons/File";
import AnnotationIcon from "@ncigdc/theme/icons/Edit";
import ShoppingCartIcon from "@ncigdc/theme/icons/ShoppingCart";
import ExploreLink from "@ncigdc/components/Links/ExploreLink";

const styles = {
  icon: {
    width: "4rem",
    height: "4rem",
    color: "#888"
  },
  card: {
    backgroundColor: "white"
  },
  heading: {
    flexGrow: 1,
    fontSize: "2rem",
    marginBottom: 7,
    marginTop: 7
  }
};

type TProps = {|
  node: Object,
  totalNumCases: number,
  theme: Object,
  numCasesAggByProject: Array<{ [string]: number }>,
  push: Function,
  query: Object,
  dispatch: Function,
  cartFiles: Array<Object>,
  totalFiles: number,
  files: Array<Object>,
  viewer: Object,
  ssmTested: boolean
|};

const getAnnotationsLinkParams = annotations => {
  if (annotations.total === 1) {
    return {
      pathname: `/annotations/${annotations.edges[0].node.annotation_id}`
    };
  } else if (annotations.total > 1) {
    return {
      pathname: "/annotations",
      query: {
        filters: makeFilter(
          [
            {
              field: "annotations.annotation_id",
              value: annotations.edges.map(
                ({ node: annotation }) => annotation.annotation_id
              )
            }
          ],
          false
        )
      }
    };
  }

  return null;
};

const Case = compose(
  withRouter,
  withTheme,
  connect(state => ({ cartFiles: state.cart.files }))
)(
  (
    {
      node,
      theme,
      numCasesAggByProject,
      push,
      query,
      dispatch,
      cartFiles,
      totalFiles,
      files,
      viewer,
      ssmTested
    }: TProps = {}
  ) => {
    const p = node;

    const experimentalStrategies = EXPERIMENTAL_STRATEGIES.reduce(
      (result, name) => {
        const strat = p.summary.experimental_strategies.find(
          item =>
            item.experimental_strategy.toLowerCase() === name.toLowerCase()
        );

        if (strat) {
          const linkQuery = {
            filters: makeFilter(
              [
                { field: "cases.case_id", value: p.case_id },
                {
                  field: "files.experimental_strategy",
                  value: [strat.experimental_strategy]
                }
              ],
              false
            )
          };

          return [
            ...result,
            {
              ...strat,
              id: strat.experimental_strategy,
              file_count: (
                <RepositoryFilesLink query={linkQuery}>
                  {strat.file_count}
                </RepositoryFilesLink>
              ),
              file_count_value: strat.file_count,
              tooltip: (
                <span>
                  <b>{strat.experimental_strategy}</b><br />
                  {strat.file_count} file{strat.file_count > 1 ? "s" : ""}
                </span>
              ),
              clickHandler: () => {
                const newQuery = mergeQuery(linkQuery, query, "replace");
                const q = removeEmptyKeys({
                  ...newQuery,
                  filters: newQuery.filters && JSURL.stringify(newQuery.filters)
                });
                push({ pathname: "/repository", query: q });
              }
            }
          ];
        }

        return result;
      },
      []
    );

    const dataCategories = Object.keys(DATA_CATEGORIES).reduce((acc, key) => {
      const type = p.summary.data_categories.find(
        item => item.data_category === DATA_CATEGORIES[key].full
      ) || {
        data_category: DATA_CATEGORIES[key].full,
        file_count: 0
      };

      const linkQuery = {
        filters: makeFilter(
          [
            { field: "cases.case_id", value: p.case_id },
            { field: "files.data_category", value: [type.data_category] }
          ],
          false
        )
      };

      return acc.concat({
        ...type,
        id: type.data_category,
        file_count: type.file_count > 0
          ? <RepositoryFilesLink query={linkQuery}>
              {type.file_count}
            </RepositoryFilesLink>
          : "0",
        file_count_value: type.file_count,
        tooltip: (
          <span>
            <b>{type.data_category}</b><br />
            {type.file_count} file{type.file_count > 1 ? "s" : ""}
          </span>
        ),
        clickHandler: () => {
          const newQuery = mergeQuery(linkQuery, query, "replace");
          const q = removeEmptyKeys({
            ...newQuery,
            filters: newQuery.filters && JSURL.stringify(newQuery.filters)
          });
          push({ pathname: "/repository", query: q });
        }
      });
    }, []);

    const hasFilesToAdd = files.filter(
      f => !cartFiles.some(cf => cf.file_id === f.file_id)
    ).length;
    const cartOperation = hasFilesToAdd
      ? addAllFilesInCart
      : removeFilesFromCart;

    const fmFilters = makeFilter(
      [{ field: "cases.project.project_id", value: p.project.project_id }],
      false
    );

    return (
      <Column spacing={theme.spacing}>
        <Row style={{ justifyContent: "flex-end" }}>
          <Button
            onClick={() => dispatch(cartOperation(files))}
            leftIcon={<ShoppingCartIcon />}
          >
            {hasFilesToAdd
              ? "Add all files to the cart"
              : "Remove all files from the cart"}
          </Button>
        </Row>

        <Row spacing={theme.spacing}>
          <EntityPageVerticalTable
            id="summary"
            title={<span><i className="fa fa-table" /> Summary</span>}
            thToTd={[
              { th: "Case UUID", td: p.case_id },
              { th: "Case Submitter ID", td: p.submitter_id },
              {
                th: "Project ID",
                td: (
                  <ProjectLink uuid={p.project.project_id}>
                    {p.project.project_id}
                  </ProjectLink>
                )
              },
              { th: "Project Name", td: p.project.name },
              { th: "Disease Type", td: p.disease_type },
              { th: "Program", td: p.project.program.name },
              { th: "Primary Site", td: p.primary_site }
            ]}
            style={{ flex: 1 }}
          />

          <Column style={{ width: "200px" }} spacing={theme.spacing}>
            <CountCard
              style={{ width: "auto" }}
              title="FILES"
              count={totalFiles.toLocaleString()}
              icon={<FileIcon style={styles.icon} className="fa-3x" />}
              linkParams={
                totalFiles
                  ? {
                      pathname: "/repository",
                      query: {
                        filters: makeFilter(
                          [{ field: "cases.case_id", value: p.case_id }],
                          false
                        ),
                        facetTab: "files",
                        searchTableTab: "files"
                      }
                    }
                  : null
              }
            />
            <CountCard
              style={{ width: "auto" }}
              title="ANNOTATIONS"
              count={p.annotations.hits.total.toLocaleString()}
              icon={<AnnotationIcon style={styles.icon} className="fa-3x" />}
              linkParams={getAnnotationsLinkParams(p.annotations.hits)}
            />
          </Column>
        </Row>

        <Row style={{ flexWrap: "wrap" }} spacing={theme.spacing}>
          <span style={{ flex: 1 }}>
            <SummaryCard
              tableTitle="File Counts by Experimental Strategy"
              pieChartTitle="File Counts by Experimental Strategy"
              data={experimentalStrategies}
              footer={`${(experimentalStrategies || []).length} Experimental Strategies`}
              path="file_count_value"
              headings={[
                {
                  key: "experimental_strategy",
                  title: "Experimental Strategy",
                  color: true
                },
                {
                  key: "file_count",
                  title: "Files",
                  style: { textAlign: "right" }
                }
              ]}
            />
          </span>
          <span style={{ flex: 1 }}>
            <SummaryCard
              tableTitle="File Counts by Data Category"
              pieChartTitle="File Counts by Experimental Strategy"
              data={dataCategories}
              footer={`${(dataCategories || []).length} Experimental Strategies`}
              path="file_count_value"
              headings={[
                { key: "data_category", title: "Data Category", color: true },
                {
                  key: "file_count",
                  title: "Files",
                  style: { textAlign: "right" }
                }
              ]}
            />
          </span>
        </Row>

        <Row id="clinical" style={{ flexWrap: "wrap" }} spacing={theme.spacing}>
          <ClinicalCard p={p} />
        </Row>

        <Row
          id="biospecimen"
          style={{ flexWrap: "wrap" }}
          spacing={theme.spacing}
        >
          <BiospecimenCard p={p} bioId={query.bioId} />
        </Row>
        {ssmTested &&
          <Column style={{ ...styles.card, marginTop: "2rem" }}>
            <h1
              style={{ ...styles.heading, padding: "1rem" }}
              id="frequent-mutations"
            >
              <i
                className="fa fa-bar-chart-o"
                style={{ paddingRight: "10px" }}
              />
              Most Frequent Somatic Mutations
            </h1>
            <Column>
              <SsmsBarChart
                style={{ width: "50%" }}
                projectId={p.project.project_id}
                defaultFilters={fmFilters}
                context={p.project.project_id}
              />
              <SsmsTable
                projectId={p.project.project_id}
                defaultFilters={fmFilters}
                context={p.project.project_id}
                tableLink={
                  <ExploreLink
                    query={{ searchTableTab: "mutations", filters: fmFilters }}
                  >
                    Open in Exploration
                  </ExploreLink>
                }
              />
            </Column>
          </Column>}
      </Column>
    );
  }
);

export default Case;