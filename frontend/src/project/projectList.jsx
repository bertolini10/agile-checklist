import React, { Component } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { getList, prepareShowUpdate, showDelete } from './projectActions'

class ProjectList extends Component {

    componentWillMount() {
        this.props.getList()
    }

    renderRows() {
        const list = this.props.list || []
        return list.map(project => (
            <tr key={project.id}>
                <td>{project.name}</td>
                <td>
                    <button className='btn btn-warning' onClick={() => this.props.prepareShowUpdate(project.id)}>
                        <i className='icon ion-md-create'></i>
                    </button>
                    <button className='btn btn-danger' onClick={() => this.props.showDelete(project)}>
                        <i className='icon ion-md-trash'></i>
                    </button>
                </td>
            </tr>
        ))
    }

    render() {
        return (
            <div>
                <table className='table'>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th className='table-actions'>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.renderRows()}
                    </tbody>
                </table>
            </div>
        )
    }
}

const mapStateToProps = state => ({list: state.project.list})
const mapDispatchToProps = dispatch => bindActionCreators({getList, prepareShowUpdate, showDelete}, dispatch)
export default connect(mapStateToProps, mapDispatchToProps)(ProjectList)