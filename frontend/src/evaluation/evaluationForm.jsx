import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { reduxForm, Field, formValueSelector } from 'redux-form'

import { init, selectChecklist} from './evaluationActions'
import { getList as getChecklists, getTree} from '../checklist/checklistActions'
import { getList as getProjects} from '../project/projectActions'
import Tree from 'tree-slide-bar'
import If from '../common/operator/if'

import Select from '../common/form/select'

class EvaluationForm extends Component {

    componentWillMount() { 
        this.props.getChecklists()
        this.props.getTree()
        this.props.getProjects()
    }

    getSprintList() {
        const sprints = []
        for(let i = 0; i < 20; i++) {
            sprints.push({id:i+1, name:`Sprint ${i+1}`})
        }
        return sprints
    }


    render() {

        const {users, projects, checklists, checklist, handleSubmit, readOnly, selectChecklist} = this.props    

        return (
            <form role='form' onSubmit={handleSubmit}>
                <div className='box-body'>
                    <Field name='projectId' label='Project' cols='12 4' 
                        component={Select} readOnly={readOnly} options={projects} optionValue='id' optionLabel='name' />
                    <Field name='sprint' label='Sprint' cols='12 4' 
                        component={Select} readOnly={readOnly}
                        options={this.getSprintList()} optionValue='id' optionLabel='name' />    
                    <Field name='checklistId' label='Checklist' cols='12 4' 
                        component={Select} readOnly={readOnly} inputOnChange={selectChecklist}
                        options={checklists.filter(u => u.parentId === null)} optionValue='id' optionLabel='description' />
                    <If test={checklist.length>0}>
                        <Field name='checklist' legend='My checklist' component={Tree} tree={checklist} />
                    </If>
                </div>
                <div className='box-footer'>
                    <button type='submit' className={`btn btn-${this.props.submitClass}`}>
                        {this.props.submitLabel}
                    </button>
                    <button type='button' className='btn btn-default'
                        onClick={this.props.init}>Cancel</button>
                </div>
            </form>
        )
    }
}

EvaluationForm = reduxForm({form: 'evaluationForm', destroyOnUnmount: false})(EvaluationForm)
const selector = formValueSelector('evaluationForm')

const mapStateToProps = state => ({
    projects: state.project.list, 
    checklists: state.checklist.list,
    checklist: state.evaluation.checklist
})
const mapDispatchToProps = dispatch => bindActionCreators({init, getChecklists, selectChecklist, getTree, getProjects}, dispatch)
export default connect(mapStateToProps, mapDispatchToProps)(EvaluationForm)